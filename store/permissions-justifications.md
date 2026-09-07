# Permission justifications

Paste each block into the matching field of the Chrome Web Store Developer
Dashboard, under **Privacy practices → Permission justification**. One field per
permission. Keep them short and concrete: reviewers reject vague justifications
("needed for the extension to work") more often than broad ones.

---

## Single purpose

> AlienMcp lets an AI assistant that the user has installed on their own computer
> operate the user's browser tabs on the user's explicit instruction: open a
> page, read it, click, fill a form, take a screenshot. The extension is the
> browser half of that bridge. It has no other function.

---

## `tabs`

> The extension exposes tab operations to the user's local AI assistant: list
> the open tabs, open a new one, switch to one, close one, and report a tab's
> URL and title so the assistant knows what it is looking at. Every tool call
> resolves an explicit tab id before acting. Without this permission the
> assistant cannot tell which page the user is asking about.

## `scripting`

> Used to run the extension's own bundled functions inside a page to carry out
> the user's instruction: click an element, fill a form field, read the visible
> text, scroll to an element, wait for an element to appear. These are
> precompiled functions shipped inside the extension package and passed to
> chrome.scripting.executeScript as `func` with serialisable `args`. No code
> string is ever compiled from input.

## `debugger`

> Four features need the Chrome DevTools Protocol and have no extension API
> equivalent: capturing console output for the assistant to read
> (`Runtime.consoleAPICalled`), listing network requests a page made
> (`Network.*`), producing a PDF of the current page (`Page.printToPDF`), and
> generating trusted keyboard and mouse events so that sites built on React,
> Vue or Angular register the input as real user input (`Input.*`). Chrome shows
> its standard "AlienMcp started debugging this browser" banner whenever a
> session is attached, and the extension detaches as soon as the operation
> finishes (reference-counted in `handlers/debugger-manager.ts`).

## `cookies`

> The `alien_cookies` tool lets the user ask their assistant whether they are
> still signed in to a given site before it tries to act there, and lets them
> clear a stale cookie. Reading a cookie requires the chrome.cookies API because
> session cookies are HttpOnly and therefore invisible to `document.cookie`.
> Cookie values are returned only to the local MCP server on
> ws://localhost:7888-7899 and are never transmitted off the machine.

## `storage`

> Stores one value: a generated instance id, in
> `src/background/websocket-client.ts`, function `getOrCreateInstanceId`
> (`chrome.storage.local.get` and `.set`, visible as those literal calls in the
> shipped `service-worker.js`). The id lets the local MCP server tell two Chrome
> profiles apart when both report the same browser name, and it has to survive
> the Manifest V3 service worker being suspended, so it cannot live in memory.
> No user content is stored.
>
> This permission was correctly flagged as unused in our previous submission: at
> that time it was declared but nothing read or wrote storage. The code that
> uses it was added afterwards.

## `alarms`

> Manifest V3 suspends the service worker after 30 seconds of inactivity, which
> would drop the WebSocket to the local MCP server. A periodic alarm wakes the
> worker to keep the connection alive. This is the pattern Chrome documents for
> long-lived connections in MV3.

## `tabGroups`

> AlienMcp scopes itself to a Chrome tab group so the user can decide exactly
> which tabs their assistant may touch. Tabs outside the group are invisible to
> every tool. The popup creates the group, adds or removes the current tab, and
> colours it so the boundary is visible. This permission is what makes the
> extension's access narrower than "all your tabs", not wider.

## Host permission `<all_urls>`

> The user decides which site their assistant works on: a job board today, a
> supplier portal or an internal admin tool tomorrow. Restricting the extension
> to a fixed list of hosts would mean the assistant silently fails on whatever
> site the user actually asked about, which is the extension's single purpose.
> Access is in practice narrowed twice by the product itself: nothing happens on
> any page until the user issues a tool call from their own MCP client, and tab
> group scoping (above) limits every tool to the tabs the user put in the group.
> The extension declares no static content scripts, so it injects nothing into
> pages the user is merely browsing.

## Remote code

> None. The package contains no remotely hosted code, no `eval`, no
> `new Function`, and no dynamic `import()` of a remote URL. The extension's only
> network destination is `ws://localhost:7888` to `ws://localhost:7899`, enforced
> by the manifest CSP (`connect-src 'self' ws://localhost:* http://localhost:*`).
