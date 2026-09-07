#!/usr/bin/env node
/**
 * AlienMcp — standalone test server for Chrome Web Store reviewers.
 *
 * The extension is the browser half of a local bridge: it does nothing until a
 * program on the same machine accepts a WebSocket connection on a port in
 * 7888-7899. In normal use that program is the user's AI assistant (Claude
 * Code, Cursor, ...). This file replaces it with a minimal, dependency-free
 * stand-in so the extension can be exercised without installing anything.
 *
 * Requirements: Node.js 18 or newer. No npm install. No network access.
 *
 *   node test-server.mjs
 *
 * Then load the extension, open any web page, and follow the printed prompts.
 */

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

const PORT = 7888;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* ---------- minimal RFC 6455 server (text frames only) ---------- */

function accept(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

function encodeFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/** Pull as many complete frames as possible out of `buf`. */
function decodeFrames(buf) {
  const out = [];
  let off = 0;
  for (;;) {
    if (buf.length - off < 2) break;
    const opcode = buf[off] & 0x0f;
    const masked = (buf[off + 1] & 0x80) !== 0;
    let len = buf[off + 1] & 0x7f;
    let p = off + 2;
    if (len === 126) {
      if (buf.length - p < 2) break;
      len = buf.readUInt16BE(p); p += 2;
    } else if (len === 127) {
      if (buf.length - p < 8) break;
      len = Number(buf.readBigUInt64BE(p)); p += 8;
    }
    let mask;
    if (masked) {
      if (buf.length - p < 4) break;
      mask = buf.subarray(p, p + 4); p += 4;
    }
    if (buf.length - p < len) break;
    const payload = Buffer.from(buf.subarray(p, p + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    p += len;
    out.push({ opcode, payload });
    off = p;
  }
  return { frames: out, rest: buf.subarray(off) };
}

/* ---------- the stand-in MCP client ---------- */

let socket = null;
let nextId = 1;
const pending = new Map();

function call(command, args = {}) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('extension not connected'));
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.write(encodeFrame(JSON.stringify({ id, command, args })));
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`timeout on "${command}"`));
    }, 20000);
  });
}

function show(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  console.log(`\n--- ${label} ---\n${text.slice(0, 1200)}\n`);
}

const SCENARIOS = {
  async 1() {
    show('alien_context: which tab is the user on', await call('context'));
  },
  async 2() {
    show('alien_tabs: the tabs in the scoped group', await call('tabs', { action: 'list' }));
  },
  async 3() {
    const r = await call('readPage', { mode: 'text' });
    show('alien_read_page: visible text of the page', r);
  },
  async 4() {
    const r = await call('screenshot', {});
    show('alien_screenshot', `captured ${String(r?.data ?? '').length} base64 chars of PNG`);
  },
  async 5() {
    show('alien_find_element: every link on the page', await call('findElement', { selector: 'a', limit: 5 }));
  },
};

const MENU = `
AlienMcp reviewer harness — listening on ws://localhost:${PORT}

  1  read the active tab's title and URL      (exercises: tabs, tabGroups)
  2  list the tabs in the scoped group        (exercises: tabs, tabGroups)
  3  read the visible text of the page        (exercises: scripting)
  4  take a screenshot of the page            (exercises: <all_urls>, debugger)
  5  find the links on the page               (exercises: scripting)
  q  quit

Type a number and press Enter.
`;

function handleUpgrade(req, sock) {
  const key = req.headers['sec-websocket-key'];
  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept(key)}\r\n\r\n`,
  );
  socket = sock;
  let buf = Buffer.alloc(0);

  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    const { frames, rest } = decodeFrames(buf);
    buf = rest;
    for (const { opcode, payload } of frames) {
      if (opcode === 8) { sock.end(); return; }
      if (opcode !== 1) continue;
      let msg;
      try { msg = JSON.parse(payload.toString('utf8')); } catch { continue; }
      if (msg.type === 'hello') {
        console.log(`\n✓ extension connected: ${msg.browser} ${msg.version}\n${MENU}`);
        continue;
      }
      if (msg.type === 'ping') continue;
      const p = pending.get(msg.id);
      if (!p) continue;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error)); else p.resolve(msg.result);
    }
  });

  sock.on('close', () => { socket = null; console.log('extension disconnected'); });
  sock.on('error', () => {});
}

// Chrome resolves "localhost" to ::1 on some systems and 127.0.0.1 on others,
// so bind both loopback addresses. Never bind 0.0.0.0: this must not be
// reachable from the network.
let listening = 0;
for (const host of ['127.0.0.1', '::1']) {
  const server = createServer((_req, res) => { res.writeHead(426); res.end('websocket only'); });
  server.on('upgrade', handleUpgrade);
  server.on('error', () => {}); // host family unavailable, or port already taken
  server.listen(PORT, host, () => {
    if (listening++ === 0) {
      console.log(`Waiting for the AlienMcp extension on ws://localhost:${PORT} ...`);
      console.log('(Load the extension in Chrome, then open any web page.)');
    }
  });
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', async (line) => {
  const choice = line.trim();
  if (choice === 'q') { rl.close(); process.exit(0); }
  const scenario = SCENARIOS[choice];
  if (!scenario) return console.log(MENU);
  try { await scenario(); } catch (e) { console.log(`\n! ${e.message}\n`); }
  console.log('Type another number, or q to quit.');
});
