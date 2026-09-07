# Notes for the reviewer

Paste this into **Submit for review → "Notes for the reviewer"** on the Chrome Web
Store Developer Dashboard. Keep it as one block; do not shorten the testing
instructions, they are what stops a "functionality not working" rejection.

---

Thank you for reviewing AlienMcp.

WHAT IT IS

AlienMcp is the browser half of a local bridge. The user installs an AI
assistant on their own computer (Claude Code, Cursor, or any other client that
speaks the Model Context Protocol) and this extension lets that assistant act in
the user's own browser tabs: open a page, read it, click, fill a form, take a
screenshot. Everything runs on the user's machine.

HOW TO TEST IT (5 minutes, no account, no npm install, no network access)

The extension deliberately does nothing until a program on the same machine
accepts a WebSocket connection on a port between 7888 and 7899. Normally that is
the user's AI assistant. So that you do not have to install one, we ship a
dependency-free stand-in.

  1. Download the harness (single file, ~200 lines, plain Node.js, no imports
     outside the standard library):
       https://github.com/YasserLoukniti/AlienMcp/blob/master/store/reviewer-harness/test-server.mjs
  2. Run it with Node.js 18 or newer:
       node test-server.mjs
     It listens on 127.0.0.1:7888 only and is never reachable from the network.
  3. Install the extension and open any ordinary web page, for example
     https://example.com
  4. The harness prints "extension connected" and a numbered menu. Press 1, 3
     and 4 to exercise, respectively, tab access, page reading, and the
     screenshot plus debugger path.

Step 4 is where you will see Chrome's own "AlienMcp started debugging this
browser" banner appear and disappear: the extension attaches a debugger session
only for the duration of one operation and detaches immediately after.

HOW THIS VERSION ANSWERS THE PREVIOUS REJECTION

The previous revision of this item was rejected under Use of Permissions, case
reference Purple Potassium, for declaring three permissions without using them:
webRequest, offscreen and storage. That finding was correct on all three. Here
is what we did with each.

  - webRequest: REMOVED. It had no call sites at all. Network inspection is
    implemented over the CDP Network domain through chrome.debugger, never over
    chrome.webRequest.
  - offscreen: REMOVED. It had no call sites at all. The WebSocket connection is
    kept alive by chrome.alarms in the service worker, not by an offscreen
    document.
  - storage: KEPT, and now genuinely used. At the time of the rejected
    submission it was indeed dead: it was declared in the first version of the
    manifest and nothing read or wrote it. The code that uses it landed
    afterwards. It is now the single call site pair
    chrome.storage.local.get / chrome.storage.local.set in
    getOrCreateInstanceId(), in src/background/websocket-client.ts, and both
    appear as those literal calls in the shipped service-worker.js. The value
    stored is one generated instance id, which lets the local MCP server tell
    two Chrome profiles apart when both report the same browser name. It must
    survive service worker suspension, so it cannot be held in memory.

We also went further than the report asked and audited every remaining
permission the same way. That turned up one more problem, which we fixed
without being asked:

  - the "activeTab" permission is REMOVED. It grants temporary access after the
    user clicks the toolbar icon, but this extension is driven by the user's
    local MCP client and resolves an explicit tab id for every call, so it
    granted nothing that <all_urls> did not already cover. We accept the
    consequence: the extension can no longer capture chrome:// pages, other
    extensions' pages, data: URLs or file: URLs.
  - the entire static content script is REMOVED. It was declared on <all_urls>
    with all_frames, so it was injected into every page and every iframe the
    user visited. It was unreachable dead code (nothing ever called
    chrome.tabs.sendMessage) and it contained the package's only "new Function"
    construct. The extension now injects nothing into pages the user is merely
    browsing, and the package contains no dynamic code evaluation at all.

Seven permissions remain. Every one of them has call sites we can point to, and
our build script now refuses to produce a package if any declared permission
stops being used, so this class of problem cannot come back silently.

DISCLOSURE ON THE ONE REMAINING DYNAMIC PATH

One tool, alien_execute_js, forwards a JavaScript expression to
chrome.debugger's Runtime.evaluate. We are flagging it rather than leaving you
to find it. The expression comes from the user's own MCP client over a loopback
WebSocket (ws://localhost:7888 to 7899, enforced by the manifest CSP), never
from a remote server, and it is the same mechanism DevTools uses when a
developer types into the console. It exists because sites with a strict
Content-Security-Policy reject dynamic evaluation through every other route.

WHY <all_urls>

The user chooses the site their assistant works on, and it differs per user and
per task, so a fixed host list would make the extension fail at its single
purpose. Two product-level constraints narrow the access in practice: nothing
happens on any page until the user issues a tool call from their own local
client, and the extension scopes every tool to a Chrome tab group the user
creates from the popup, so tabs outside that group are invisible to it.

PRIVACY

No data leaves the machine. The extension's only network destination is
ws://localhost:7888 to 7899. There is no analytics, no telemetry, no developer
backend. Full policy: https://alien-mcp.com/privacy

Source code: https://github.com/YasserLoukniti/AlienMcp
