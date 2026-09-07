#!/usr/bin/env node
/**
 * Generate the Chrome Web Store screenshots.
 *
 *   node store/scripts/screenshots.mjs
 *
 * The popup in every shot is the REAL popup: this script inlines
 * src/popup/popup.html, src/popup/popup.css and the compiled dist/popup.js,
 * and feeds them a mocked chrome.* API. Nothing here is a redrawn mockup, so
 * the screenshots cannot drift from the product. Re-run after any popup change.
 *
 * Rendering uses the local Chrome in headless mode, so there is nothing to
 * install. Output: store/dist/screenshots/*.png at 1280x800.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.resolve(HERE, '..');
const EXT = path.resolve(STORE, '..', 'packages', 'chrome-extension');
const OUT = path.join(STORE, 'dist', 'screenshots');
const WORK = path.join(os.tmpdir(), 'alienmcp-shots');

const W = 1280;
const H = 800;

/* ---------------- locate Chrome ---------------- */

function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
        `${process.env['PROGRAMFILES']}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`,
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const found = candidates.find((c) => c && existsSync(c));
  if (!found) throw new Error('Chrome not found; add its path to findChrome().');
  return found;
}

const CHROME = findChrome();

function shoot(htmlPath, pngPath) {
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
    `--user-data-dir=${path.join(WORK, 'profile')}`,
    `--window-size=${W},${H}`,
    '--virtual-time-budget=5000',
    `--screenshot=${pngPath}`,
    `file://${htmlPath.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore' });
}

/* ---------------- the real popup, made renderable outside the extension ---------------- */

const manifestVersion = JSON.parse(readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version;
const popupHtml = readFileSync(path.join(EXT, 'src', 'popup', 'popup.html'), 'utf8');
const popupCssRaw = readFileSync(path.join(EXT, 'src', 'popup', 'popup.css'), 'utf8');
const popupJs = readFileSync(path.join(EXT, 'dist', 'popup.js'), 'utf8');

// The popup styles `body` directly. Inside a 1280px stage that has to be scoped
// to its own frame instead. Nothing else in the stylesheet is touched.
const popupCss = popupCssRaw.replace(/^body\s*\{/m, '.popup-frame {');
const popupBody = popupHtml.slice(popupHtml.indexOf('<div class="app">'), popupHtml.indexOf('<script'));

/** A believable session: a few job tabs shared, the private ones not. */
const TABS = [
  { id: 1, title: 'Senior Frontend Engineer - Alan', url: 'https://www.welcometothejungle.com/fr/companies/alan/jobs', shared: true, active: true },
  { id: 2, title: 'Product Designer - Payfit', url: 'https://www.welcometothejungle.com/fr/companies/payfit/jobs', shared: true },
  { id: 3, title: 'Application form', url: 'https://jobs.lever.co/apply', shared: true },
  { id: 4, title: 'Gmail', url: 'https://mail.google.com/mail/u/0', shared: false },
  { id: 5, title: 'Figma - Design system', url: 'https://www.figma.com/file/rNs2', shared: false },
  { id: 6, title: 'localhost:3000', url: 'http://localhost:3000/dashboard', shared: false },
  { id: 7, title: 'Notion - Weekly notes', url: 'https://www.notion.so/weekly', shared: false },
];

function chromeMock({ connected = true, ports = [7888], tabs = TABS } = {}) {
  const hasGroup = tabs.some((t) => t.shared);
  return [
    `const TABS = ${JSON.stringify(tabs)};`,
    'window.chrome = {',
    '  runtime: {',
    `    getManifest: () => ({ version: ${JSON.stringify(manifestVersion)} }),`,
    `    sendMessage: (msg, cb) => cb({ connected: ${connected}, sessionCount: ${ports.length}, ports: ${JSON.stringify(ports)} }),`,
    '    lastError: null,',
    '  },',
    `  tabGroups: { query: async () => (${hasGroup} ? [{ id: 99, title: 'AlienMcp' }] : []) },`,
    '  tabs: {',
    '    query: async () => TABS.map((t) => ({',
    '      id: t.id, title: t.title, url: t.url, active: !!t.active,',
    '      windowId: 1, groupId: t.shared ? 99 : -1,',
    "      favIconUrl: 'https://www.google.com/s2/favicons?sz=64&domain=' + new URL(t.url).hostname,",
    '    })),',
    '    update: () => {}, group: async () => 99, ungroup: async () => {},',
    '  },',
    '  windows: { update: () => {} },',
    '};',
  ].join('\n');
}

/* ---------------- the stage ---------------- */

const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Public+Sans:wght@400;500&family=DM+Mono:wght@400&display=swap';

const shell = (title, css, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
  :root {
    --ink:#05070f; --surface:#f7f7fb; --mint:#7fe7c4; --mint-deep:#0b8c68; --muted:#6a7590;
    --display:'Bricolage Grotesque',system-ui,sans-serif;
    --body:'Public Sans',system-ui,sans-serif;
    --mono:'DM Mono',ui-monospace,monospace;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{font-family:var(--body);background:var(--surface);color:var(--ink)}
${popupCss}
  .popup-frame{border-radius:12px;overflow:hidden;
    box-shadow:0 28px 64px -14px rgba(0,0,0,.55), 0 0 0 1px rgba(5,7,15,.1)}
  .on-dark .popup-frame{box-shadow:0 28px 64px -14px #000, 0 0 0 1px rgba(255,255,255,.11)}
${css}
</style></head><body>${body}</body></html>`;

const caption = `
  .caption{position:absolute;left:88px;top:50%;transform:translateY(-50%);max-width:430px}
  .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.09em;text-transform:uppercase;
    color:var(--mint-deep);margin-bottom:20px}
  .caption h2{font-family:var(--display);font-size:46px;line-height:1.04;font-weight:700;letter-spacing:-.026em}
  .caption p{margin-top:20px;font-size:17px;line-height:1.55;color:var(--muted)}
`;

const shots = [];

// 1. The product itself: the boundary, and the control over it.
shots.push({
  name: '01-scope',
  mock: chromeMock(),
  css: caption + `
    .stage{position:absolute;inset:0;
      background:radial-gradient(900px 520px at 78% 46%, #e9edf4 0%, var(--surface) 62%)}
    .popup-frame{position:absolute;right:120px;top:50%;transform:translateY(-50%)}
  `,
  body: `<div class="stage">
    <div class="caption">
      <div class="eyebrow">Tab scoping</div>
      <h2>You decide which tabs it can touch.</h2>
      <p>Share a tab and your assistant can read it and act on it. Everything else stays out of reach, including the tab you are reading this on.</p>
    </div>
    <div class="popup-frame">${popupBody}</div>
  </div>`,
});

// 2. The locality claim, drawn: nothing crosses the machine boundary.
shots.push({
  name: '02-local',
  mock: '',
  css: `
    .stage{position:absolute;inset:0;background:var(--ink);padding:70px 88px 62px;
      display:flex;flex-direction:column}
    .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.09em;
      text-transform:uppercase;color:var(--mint)}
    h2{font-family:var(--display);font-size:42px;font-weight:700;letter-spacing:-.026em;
      color:#fff;margin:14px 0 8px;max-width:760px;line-height:1.06}
    .lede{font-size:17px;line-height:1.55;color:#a79dbe;max-width:620px}
    .middle{flex:1;display:flex;align-items:center}
    .box{width:100%;min-height:400px;display:flex;flex-direction:column;justify-content:center;
      border:1.5px dashed rgba(127,231,196,.42);border-radius:16px;
      padding:48px 42px;position:relative}
    .box-label{position:absolute;top:-11px;left:26px;background:var(--ink);padding:0 10px;
      font-family:var(--mono);font-size:12px;letter-spacing:.06em;color:var(--mint)}
    .flow{display:flex;align-items:stretch;gap:0}
    .node{flex:1;padding:26px 24px;border-radius:12px;background:#101725;
      box-shadow:inset 0 0 0 1px #1c2638}
    .node.end{background:rgba(127,231,196,.09);box-shadow:inset 0 0 0 1px rgba(127,231,196,.34)}
    .node b{display:block;font-family:var(--display);font-size:19px;font-weight:700;color:#e8edf7}
    .node span{display:block;margin-top:7px;font-size:14px;line-height:1.45;color:#9aa5bd}
    .hop{flex:none;width:120px;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:8px}
    .hop i{display:block;width:100%;height:1px;background:#2b3548}
    .hop em{font-family:var(--mono);font-size:12px;font-style:normal;color:#7d8aa3}
    .out{margin-top:30px;font-family:var(--mono);font-size:13px;color:#6a7590}
  `,
  body: `<div class="stage">
    <div class="eyebrow">Runs on your machine</div>
    <h2>No server. No account. No telemetry.</h2>
    <p class="lede">The extension talks to exactly one place: a program you started yourself, on this computer. Nothing it reads ever leaves it.</p>
    <div class="middle"><div class="box">
      <span class="box-label">your computer</span>
      <div class="flow">
        <div class="node"><b>Your AI assistant</b><span>Claude Code, Cursor, others</span></div>
        <div class="hop"><em>stdio</em><i></i></div>
        <div class="node"><b>MCP server</b><span>localhost, port 7888</span></div>
        <div class="hop"><em>websocket</em><i></i></div>
        <div class="node end"><b>Your Chrome tabs</b><span>only the ones you shared</span></div>
      </div>
      <p class="out">outbound connections: none</p>
    </div></div>
  </div>`,
});

// 3. The toolkit, grouped by what each tool acts on rather than listed flat.
const GROUPS = [
  ['Sees', 'Read the page, and know which page it even is.',
    ['alien_context', 'alien_tabs', 'alien_read_page', 'alien_find_element', 'alien_screenshot', 'alien_pdf']],
  ['Acts', 'Click, type and fill, with events the page trusts.',
    ['alien_navigate', 'alien_click', 'alien_type', 'alien_form_input', 'alien_hover', 'alien_scroll', 'alien_wait', 'alien_modify_dom']],
  ['Inspects', 'Look under the page when it misbehaves.',
    ['alien_console', 'alien_network', 'alien_cookies', 'alien_storage', 'alien_execute_js', 'alien_emulate']],
];

shots.push({
  name: '03-tools',
  mock: '',
  css: `
    .stage{position:absolute;inset:0;padding:76px 88px 70px;background:var(--surface);
      display:flex;flex-direction:column}
    .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.09em;
      text-transform:uppercase;color:var(--mint-deep)}
    h2{font-family:var(--display);font-size:42px;font-weight:700;letter-spacing:-.026em;margin:14px 0 54px}
    .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1}
    .col h3{font-family:var(--display);font-size:16px;font-weight:700;padding-bottom:11px;
      border-bottom:2px solid var(--ink)}
    .col .gloss{margin:14px 0 28px;font-size:14.5px;line-height:1.5;color:var(--muted)}
    .col li{list-style:none;font-family:var(--mono);font-size:15px;line-height:2.75;color:#333c4d}
    .col li::before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;
      background:var(--mint-deep);margin-right:12px;vertical-align:middle}
  `,
  body: `<div class="stage">
    <div class="eyebrow">20 tools</div>
    <h2>Everything it needs to work a page.</h2>
    <div class="cols">${GROUPS.map(([g, gloss, items]) => `<div class="col"><h3>${g}</h3><p class="gloss">${gloss}</p><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>`,
});

/* ---------------- render ---------------- */

mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });

for (const s of shots) {
  const scripts = s.mock ? `<script>${s.mock}</script><script>${popupJs}</script>` : '';
  const htmlPath = path.join(WORK, `${s.name}.html`);
  const pngPath = path.join(OUT, `${s.name}.png`);
  writeFileSync(htmlPath, shell(s.name, s.css, s.body + scripts));
  shoot(htmlPath, pngPath);
  console.log(`  ${path.relative(process.cwd(), pngPath)}`);
}

rmSync(path.join(WORK, 'profile'), { recursive: true, force: true });
console.log(`\n${shots.length} screenshots at ${W}x${H}, popup v${manifestVersion} rendered from source.`);
