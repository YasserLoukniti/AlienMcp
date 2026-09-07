#!/usr/bin/env node
/**
 * Upload the packaged zip to the Chrome Web Store and submit it for review.
 *
 *   node store/scripts/package.mjs      # build + verify the zip first
 *   node store/scripts/publish.mjs      # upload + submit
 *   node store/scripts/publish.mjs --upload-only   # upload only, do not submit
 *   node store/scripts/publish.mjs --status   # just report the item's state
 *
 * Uses the Chrome Web Store API v2. The v1 API is deprecated and stops working
 * on 15 October 2026, so do not port this back to v1.
 *
 * This script updates an item that ALREADY EXISTS. The very first submission
 * has to go through the Developer Dashboard, because the listing text,
 * screenshots, permission justifications and privacy answers can only be
 * entered there. See ../README.md.
 *
 * Credentials come from store/.env (see .env.example).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.resolve(HERE, '..');

/* ---------------- config ---------------- */

const envPath = path.join(STORE, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const REQUIRED = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_PUBLISHER_ID', 'CWS_EXTENSION_ID'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing credentials: ${missing.join(', ')}`);
  console.error(`Fill ${path.relative(process.cwd(), envPath)} — see .env.example for how to obtain each one.`);
  process.exit(1);
}

const { CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_PUBLISHER_ID, CWS_EXTENSION_ID } = process.env;
const BASE = 'https://chromewebstore.googleapis.com';
const ITEM = `publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}`;

/* ---------------- auth ---------------- */

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CWS_CLIENT_ID,
      client_secret: CWS_CLIENT_SECRET,
      refresh_token: CWS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function api(method, url, { token, body, contentType } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  if (!res.ok) throw new Error(`${method} ${url}\n  ${res.status} ${JSON.stringify(parsed)}`);
  return parsed;
}

/* ---------------- run ---------------- */

const statusOnly = process.argv.includes('--status');
const token = await accessToken();

if (statusOnly) {
  const status = await api('GET', `${BASE}/v2/${ITEM}:fetchStatus`, { token });
  console.log(JSON.stringify(status, null, 2));
  process.exit(0);
}

const distDir = path.join(STORE, 'dist');
const zips = existsSync(distDir) ? readdirSync(distDir).filter((f) => f.endsWith('.zip')).sort() : [];
if (!zips.length) {
  console.error('No zip in store/dist. Run: node store/scripts/package.mjs');
  process.exit(1);
}
const zipPath = path.join(distDir, zips[zips.length - 1]);
const zip = readFileSync(zipPath);

console.log(`› uploading ${path.basename(zipPath)} (${(zip.length / 1024).toFixed(1)} KB)`);
const upload = await api('POST', `${BASE}/upload/v2/${ITEM}:upload`, {
  token,
  body: zip,
  contentType: 'application/zip',
});
console.log(`  ${JSON.stringify(upload)}`);

if (upload.uploadState === 'FAILURE') {
  console.error('✗ upload rejected by the store:');
  for (const e of upload.itemError ?? []) console.error(`  - ${e.error_detail ?? JSON.stringify(e)}`);
  process.exit(1);
}

if (process.argv.includes('--upload-only')) {
  console.log('\n✓ package uploaded to the draft. Not submitted for review (--upload-only).');
  process.exit(0);
}

console.log('› submitting for review');
const published = await api('POST', `${BASE}/v2/${ITEM}:publish`, {
  token,
  body: JSON.stringify({}),
  contentType: 'application/json',
});
console.log(`  ${JSON.stringify(published)}`);

console.log('\n✓ submitted. Track it at:');
console.log(`  https://chrome.google.com/webstore/devconsole/${CWS_PUBLISHER_ID}/${CWS_EXTENSION_ID}/edit`);
console.log('\nReview typically takes a few days. If it is rejected, the email names a');
console.log('violation code — see store/compliance-audit.md for what we already ruled out.');
