# Chrome Web Store submission package

Everything needed to publish AlienMcp to the Chrome Web Store, plus the audit
that explains what was wrong with the previous attempt.

## Why the last submission was rejected, and what changed

The rejection was for permissions declared but not used. That was accurate, and
it was worse than it looked. `compliance-audit.md` has the full grep-backed
audit; the short version:

| Removed | Call sites in the source |
|---|---|
| `webRequest` permission | 0 |
| `offscreen` permission | 0 |
| `activeTab` permission | 0 |
| the entire static content script on `<all_urls>` + `all_frames` | unreachable, and it held the package's only `new Function` |

The content script was the real problem. It was injected into every page and
every iframe the user ever visited, it compiled strings into code, and nothing
ever called it. On its own it was enough for a second rejection, under a
different code (Blue Argon, remotely hosted / dynamically evaluated code).

Seven permissions remain, every one of them with call sites listed in the audit.
`scripts/package.mjs` re-runs that check on every build and refuses to produce a
zip if it fails.

## Files

| File | What it is |
|---|---|
| `compliance-audit.md` | the permission and code audit, with evidence |
| `listing.md` | item name, summary, description, category, asset list |
| `permissions-justifications.md` | one paste-ready block per permission field |
| `privacy-disclosures.md` | which data-usage boxes to tick, and the wording |
| `reviewer-notes.md` | the "Notes for the reviewer" block |
| `screenshots.md` | how to capture the 3 required screenshots |
| `reviewer-harness/test-server.mjs` | dependency-free local server so a reviewer can actually test the extension |
| `scripts/package.mjs` | build + preflight + zip |
| `scripts/publish.mjs` | upload + submit, via the Chrome Web Store API v2 |
| `.env.example` | how to obtain each API credential |

## Build the package

    node store/scripts/package.mjs

Rebuilds the extension, runs the preflight (unused permissions, `eval` family,
remote origins, missing files), and writes `store/dist/alienmcp-<version>.zip`.
Current output: 8 files, 37.8 KB.

## Submitting

### This is an update to an existing item, not a first submission

The item already exists and already carries an id:

    dpjgfdpcgfifhjecpjcolbmadfkmmbeo

That is good news. The install link is already determined and will not change,
the listing text and screenshots you entered before are still there, and the
developer account and its 5 USD fee are behind you. Both ids are already filled
into `store/.env`.

What is left is: upload the new zip, correct the permission justifications for
the seven permissions that remain, and resubmit with the reviewer notes. Then
`publish.mjs` handles every release after that.

Do NOT use the "Faire appel" / appeal button. The rejection was correct on all
three permissions it named, so an appeal would be arguing a point we lose.
Resubmitting a corrected package is the right move and the faster one.

### Steps in the dashboard

The listing text, the screenshots, the permission justifications and the privacy
answers can only be entered through the Developer Dashboard. There is no API for
them, and they are precisely what the reviewer reads. So this resubmission is
manual. The steps, in order:

1. **Publish the privacy policy** at <https://alien-mcp.com/privacy>, serving the
   contents of `../PRIVACY.md`. A 404 there is an automatic rejection.
2. **Open the existing item** and upload `store/dist/alienmcp-1.2.0.zip` as a new
   package version.
3. **Store listing tab**: paste from `listing.md`. Upload the screenshots from
   `screenshots.md`.
4. **Privacy practices tab**: paste the single purpose and each permission
   justification from `permissions-justifications.md`, tick the data-usage boxes
   per `privacy-disclosures.md`, and certify the three statements.
5. **Distribution tab**: set visibility to **Unlisted**. The extension is
   installable by anyone holding the link, but does not appear in search or in
   the storefront. Same review, smaller surface.
6. **Submit for review**, pasting `reviewer-notes.md` into the reviewer notes
   field. Do not skip this: an extension that does nothing without a local
   server is a textbook "functionality not working" rejection, and the notes are
   what prevent it.

### Every submission after that: one command

    node store/scripts/package.mjs && node store/scripts/publish.mjs

Credentials in `store/.env`, obtained once by following `.env.example`.
`node store/scripts/publish.mjs --status` reports the item's current state.

Note what the API can and cannot tell you. `fetchStatus` returns the item name
and a state out of PENDING_REVIEW, STAGED, PUBLISHED, PUBLISHED_TO_TESTERS,
REJECTED or CANCELLED, plus `warned` and `takenDown` flags. It carries **no
rejection reason and no reviewer feedback**, and there is no endpoint that lists
a publisher's items. A rejection motive exists only in the email Google sends
and in the dashboard banner. Neither is reachable programmatically, and neither
is reachable by browser automation: Chromium hardcodes the Web Store and the
developer console as origins no extension may script or capture, in Chrome and
in every Chromium derivative including Opera.

## After approval

The install link becomes:

    https://chromewebstore.google.com/detail/<CWS_EXTENSION_ID>

Point the job-hunter onboarding at it (the `alienmcp` step in
`apps/web/src/app/(onboarding)/onboarding/tool-steps.ts` and the URL in
`instructions.ts`), and the five-gesture developer-mode dance becomes one click.
Keep the existing "load unpacked" path as the fallback for users on a locked-down
Chrome.
