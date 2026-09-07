# Dashboard fields, ready to paste

The Test instructions field caps at **500 characters**, so the reviewer material
cannot go in one block. It splits across three fields, each of which is the right
home for its part. Character counts are given so you can see the headroom.

---

## 1. Test instructions tab  (472 / 500)

This field has one job: let the reviewer actually exercise the extension. Nothing
else belongs here.

```
The extension is inert until an MCP client on the same machine accepts a WebSocket on port 7888-7899.

To test without installing one, run our dependency-free stand-in (Node 18+, no npm install, binds 127.0.0.1 only):
github.com/YasserLoukniti/AlienMcp/blob/master/store/reviewer-harness/test-server.mjs

  node test-server.mjs

Then open any web page. The harness prints a menu; press 1, 3 and 4 to exercise tab access, page reading, and the screenshot and debugger path.
```

---

## 2. Privacy practices tab → Remote code  (662 chars)

This is where the one dynamic path gets disclosed. Declaring it here, in the
field Google built for it, is far stronger than letting a reviewer find it.

```
No remotely hosted code. The package contains no eval, no new Function, no dynamic import of a remote URL, and no script fetched from a server. The manifest CSP pins connect-src to ws://localhost, so the only reachable destination is the user's own machine.

One tool, alien_execute_js, forwards a JavaScript expression to chrome.debugger Runtime.evaluate. We flag it rather than leave you to find it: the expression comes from the user's own MCP client over that loopback socket, never from a server, and it is the same mechanism DevTools uses when a developer types into the console. Sites with a strict CSP reject dynamic evaluation through every other route.
```

---

## 3. Privacy practices tab → Single purpose  (279 chars)

```
AlienMcp lets an AI assistant the user installed on their own computer operate the user's browser tabs on the user's explicit instruction: open a page, read it, click, fill a form, take a screenshot. The extension is the browser half of that bridge, and it has no other function.
```

---

## What has no home on the dashboard

The rest of `reviewer-notes.md` — the point-by-point answer to the previous
rejection, the account of what happened to `webRequest`, `offscreen`, `storage`
and `activeTab`, and the removal of the dead content script — has no field of its
own. Two things carry it instead:

- the **permission justification** fields, one per permission, which is where a
  reviewer looks when re-checking a Purple Potassium rejection. The `storage`
  justification already states plainly that the previous finding was correct and
  that the usage landed afterwards.
- the **public source**, which now matches the submitted package exactly:
  `github.com/YasserLoukniti/AlienMcp` serves manifest 1.3.0 with seven
  permissions and no content script.

Keep `reviewer-notes.md` as the record of the reasoning. It is what you send if a
reviewer replies and asks, and it is what the next person on this repo reads to
understand why the manifest looks the way it does.
