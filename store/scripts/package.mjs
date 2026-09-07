#!/usr/bin/env node
/**
 * Build the Chrome Web Store upload package.
 *
 *   node store/scripts/package.mjs
 *
 * Rebuilds the extension, checks it against the rules that get submissions
 * rejected, and writes store/dist/alienmcp-<version>.zip.
 *
 * The zip is written with Node's zlib rather than a shell tool so the archive
 * is identical on every platform and always uses forward-slash entry names,
 * which the Chrome Web Store requires.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.resolve(HERE, '..');
const EXT = path.resolve(STORE, '..', 'packages', 'chrome-extension');
const DIST = path.join(EXT, 'dist');
const OUT_DIR = path.join(STORE, 'dist');

/** Files present in dist/ that must NOT ship to the store. */
const EXCLUDE = [
  'icons/icon512.png', // 1.07 MB, not referenced by the manifest
];
const EXCLUDE_EXT = ['.map', '.md', '.zip'];

/* ---------------- 1. build ---------------- */

console.log('› building extension');
execFileSync('npm', ['run', 'build'], { cwd: EXT, stdio: 'inherit', shell: true });

/* ---------------- 2. collect ---------------- */

function walk(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push({ abs, rel });
  }
  return out;
}

const files = walk(DIST).filter(
  (f) => !EXCLUDE.includes(f.rel) && !EXCLUDE_EXT.includes(path.extname(f.rel)),
);

/* ---------------- 3. preflight ---------------- */

const manifest = JSON.parse(readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
const problems = [];

// a. every permission must have at least one call site in the source.
//    Declarative permissions have no API namespace, so a grep cannot vouch for
//    them; they must be argued by hand in ../compliance-audit.md.
const DECLARATIVE = new Set(['activeTab', 'background', 'unlimitedStorage', 'webRequestBlocking']);
// a. every permission must have at least one call site in the source
const src = walk(path.join(EXT, 'src'))
  .filter((f) => f.rel.endsWith('.ts'))
  .map((f) => readFileSync(f.abs, 'utf8'))
  .join('\n');
for (const perm of manifest.permissions ?? []) {
  if (DECLARATIVE.has(perm)) {
    problems.push(`permission "${perm}" is declarative: argue it in compliance-audit.md or drop it`);
    continue;
  }
  if (!new RegExp(`chrome\.${perm}\.`).test(src)) {
    problems.push(`permission "${perm}" is declared but never used (Purple Potassium)`);
  }
}

// b. no dynamic code evaluation anywhere in the shipped bundle
for (const f of files.filter((f) => f.rel.endsWith('.js'))) {
  const code = readFileSync(f.abs, 'utf8');
  for (const pattern of ['new Function', 'eval(']) {
    if (code.includes(pattern)) problems.push(`${f.rel} contains "${pattern}" (Blue Argon)`);
  }
}

// c. no remote origin anywhere in the shipped bundle
for (const f of files.filter((f) => f.rel.endsWith('.js'))) {
  const code = readFileSync(f.abs, 'utf8');
  const remote = code.match(/(?:https?|wss?):\/\/(?!localhost|127\.0\.0\.1)[a-z0-9.-]+/gi);
  if (remote) problems.push(`${f.rel} references a remote origin: ${[...new Set(remote)].join(', ')}`);
}

// d. every file the manifest names must exist
const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
].filter(Boolean);
for (const ref of referenced) {
  if (!files.some((f) => f.rel === ref)) problems.push(`manifest references missing file "${ref}"`);
}

if (problems.length) {
  console.error('\n✗ preflight failed:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`› preflight passed (${manifest.permissions.length} permissions, all used)`);

/* ---------------- 4. zip ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// A fixed timestamp keeps the archive byte-identical between runs.
const DOS_TIME = 0;
const DOS_DATE = (2026 - 1980) << 9 | (1 << 5) | 1;

const locals = [];
const central = [];
let offset = 0;

for (const f of files) {
  const name = Buffer.from(f.rel, 'utf8');
  const raw = readFileSync(f.abs);
  const deflated = deflateRawSync(raw, { level: 9 });
  const useStore = deflated.length >= raw.length;
  const body = useStore ? raw : deflated;
  const method = useStore ? 0 : 8;
  const crc = crc32(raw);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0, 6);
  lh.writeUInt16LE(method, 8);
  lh.writeUInt16LE(DOS_TIME, 10);
  lh.writeUInt16LE(DOS_DATE, 12);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(body.length, 18);
  lh.writeUInt32LE(raw.length, 22);
  lh.writeUInt16LE(name.length, 26);
  lh.writeUInt16LE(0, 28);
  locals.push(lh, name, body);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0, 8);
  ch.writeUInt16LE(method, 10);
  ch.writeUInt16LE(DOS_TIME, 12);
  ch.writeUInt16LE(DOS_DATE, 14);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(body.length, 20);
  ch.writeUInt32LE(raw.length, 24);
  ch.writeUInt16LE(name.length, 28);
  ch.writeUInt32LE(0, 36); // external attrs
  ch.writeUInt32LE(offset, 42);
  central.push(ch, name);

  offset += lh.length + name.length + body.length;
}

const centralBuf = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralBuf.length, 12);
eocd.writeUInt32LE(offset, 16);

const zip = Buffer.concat([...locals, centralBuf, eocd]);

mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, `alienmcp-${manifest.version}.zip`);
writeFileSync(outPath, zip);

console.log(`\n✓ ${path.relative(process.cwd(), outPath)}`);
console.log(`  ${files.length} files, ${(zip.length / 1024).toFixed(1)} KB`);
console.log(`  sha256 ${createHash('sha256').update(zip).digest('hex').slice(0, 16)}`);
for (const f of files) console.log(`  · ${f.rel}`);
