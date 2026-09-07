# Chrome Web Store compliance audit — AlienMcp 1.2.0

Audit performed against the full extension source (`packages/chrome-extension/src`)
before the store submission. Every claim below is backed by a grep over the
source tree, not by reading the manifest.

## 1. Permissions actually used

Method: for each permission `P`, count `chrome.P.` call sites in `src/`.

| Permission  | Call sites | Files |
|-------------|-----------:|-------|
| `tabs`      | 33 | `handlers/cookies.ts`, `handlers/group-utils.ts`, `handlers/navigate.ts`, `handlers/screenshot.ts`, `handlers/tabs.ts`, `popup/popup.ts` |
| `scripting` | 10 | `handlers/click.ts`, `find-element.ts`, `form-input.ts`, `hover.ts`, `modify-dom.ts`, `read-page.ts`, `scroll.ts`, `storage.ts`, `type.ts`, `wait.ts` |
| `tabGroups` | 11 | `handlers/group-utils.ts`, `popup/popup.ts` |
| `debugger`  |  9 | `handlers/console.ts`, `debugger-manager.ts`, `execute-js.ts`, `network.ts` (+ `emulate.ts`, `pdf.ts` via the manager) |
| `storage`   |  4 | `background/websocket-client.ts` |
| `cookies`   |  4 | `handlers/cookies.ts` |
| `alarms`    |  2 | `background/service-worker.ts` |
| `webRequest`|  **0** | none |
| `offscreen` |  **0** | none |
| `activeTab` |  n/a | declarative, grants nothing this extension uses (see below) |

Also verified absent, and therefore never declared: `notifications`, `downloads`,
`history`, `bookmarks`, `management`.

`chrome.windows` (1 call site, `popup/popup.ts`) and `chrome.runtime` (9 call
sites) require no permission entry.

### The rejected revision, and `storage`

The previous submission was rejected under Purple Potassium for three
permissions: `webRequest`, `offscreen` and `storage`. All three findings were
correct at the time.

`storage` deserves the detail, because it is kept in this version. Git says the
manifest declared it from the initial commit, `ca70263` (2 April 2026), while
the only code that touches it, `getOrCreateInstanceId` in
`background/websocket-client.ts`, arrived in `5492eef` (30 April 2026). Any
review between those two dates saw a permission with no call sites, and was
right to say so.

The usage now exists and survives the production build: `chrome.storage.local.get`
and `chrome.storage.local.set` are present as those literal strings in the
emitted `dist/service-worker.js`, so a static scan finds them.

### Removed in 1.2.0

- **`webRequest`** — zero call sites. Network monitoring (`alien_network`) is
  implemented over the CDP `Network` domain through `chrome.debugger`, not over
  `chrome.webRequest`. The permission was pure dead weight.
- **`offscreen`** — zero call sites. The WebSocket is kept alive by
  `chrome.alarms` in the service worker, never by an offscreen document.
- **`activeTab`** — redundant here, with one documented consequence.
  `activeTab` is declarative, so "no `chrome.activeTab.*` call sites" is not by
  itself an argument; the argument is that it grants nothing this extension
  uses. It confers temporary host access to the current tab *after the user
  clicks the extension's toolbar icon*, and AlienMcp is not driven from the
  toolbar: every operation is initiated by the user's MCP client and resolves an
  explicit tab id through `resolveTabId()`. For ordinary http/https pages the
  `<all_urls>` host permission already covers everything `activeTab` would.

  The consequence, stated plainly: `chrome.tabs.captureVisibleTab` accepts
  `<all_urls>` for normal pages but requires `activeTab` for what Chrome calls
  sensitive sites, namely `chrome://` pages, other extensions' pages, `data:`
  URLs and `file:` URLs. After this change AlienMcp can no longer screenshot
  those four. That is an acceptable loss for a tool whose purpose is acting on
  websites, and it is the narrower behaviour the policy asks for.

These three are exactly the "declared but never used" class that Purple
Potassium rejects. They are gone.

## 2. Remotely hosted code / dynamic evaluation (Blue Argon)

`src/content/content-script.ts` contained the only `new Function(...)` in the
codebase, evaluating a code string arriving by message:

```js
const fn = new Function(`return (async () => (${src}))();`);
```

It was declared as a static content script on `<all_urls>` with
`all_frames: true`, so it was injected into every page and every iframe the user
ever visited.

**It was also unreachable dead code.** `chrome.tabs.sendMessage` does not appear
anywhere in the source, so nothing ever sent it a message. The MCP tool
`alien_execute_js` is routed by `command-router.ts` to `handlers/execute-js.ts`,
which uses the CDP `Runtime.evaluate` path, never the content script.

### Removed in 1.2.0

- `src/content/content-script.ts` deleted.
- its `webpack` entry removed.
- the whole `content_scripts` block removed from the manifest.

Effects: the only `eval`-family construct in the package is gone, and the
extension no longer injects any code into pages the user merely browses. Code
now runs in a page only when the user's own MCP client issues a tool call for
that specific tab.

Post-build verification: `grep -c "new Function\|eval(" dist/*.js` returns 0 for
every emitted file.

## 3. Remaining reviewable surface, declared honestly

- `handlers/execute-js.ts` sends a code string to `chrome.debugger` →
  `Runtime.evaluate`. The string originates from the user's own MCP client on
  `ws://localhost:7888-7899`, never from a remote server. This is the same code
  path DevTools itself uses. It is disclosed in `reviewer-notes.md`.
- `<all_urls>` host permission is retained and justified in
  `permissions-justifications.md`: an agent the user is driving must be able to
  act on whichever site the user points it at.

## 4. Network surface

`background/websocket-client.ts` scans ports 7888 to 7899 and opens
`ws://localhost:${port}`. There is no other network destination in the package.
The manifest CSP restricts `connect-src` to `'self' ws://localhost:*
http://localhost:*`.

## 5. Package hygiene

- `icons/icon512.png` (1.07 MB) is not referenced by the manifest and is
  excluded from the uploaded zip by `scripts/package.mjs`.
- No source maps, no `node_modules`, no dotfiles in the zip.
