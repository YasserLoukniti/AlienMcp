# Screenshots

The store requires at least one screenshot, at 1280x800 or 640x400 PNG. Up to
five. They must show the extension actually running in Chrome: a listing whose
images are marketing mockups rather than the product is rejected under Yellow
Zinc (insufficient or misleading metadata).

These are the one part of the package that cannot be generated from the repo,
because they need a real browser with the extension loaded and real pages on
screen.

## Capture them like this

Set the browser window to 1280x800 before capturing, so no rescaling is needed:
open DevTools, run in the console

    window.resizeTo(1280, 800 + (window.outerHeight - window.innerHeight))

### 1. The popup, connected, with a tab group active

Start the MCP server (or `store/reviewer-harness/test-server.mjs`), open a
couple of tabs, click the AlienMcp icon, create the group from the popup. Capture
the popup over the page. This is the screenshot that shows a reviewer the
extension is scoped rather than ambient.

Caption: *You choose which tabs your assistant can touch.*

### 2. The assistant driving a real page

A job board or any ordinary site on the left, your MCP client's transcript on the
right showing the tool calls that produced what is on screen. This is the "what
is it for" image.

Caption: *Your local AI assistant works in your own tabs, with your own sessions.*

### 3. The debugging banner

Trigger a screenshot or a PDF export so Chrome's own "AlienMcp started debugging
this browser" banner is visible, and capture it.

Caption: *Chrome tells you whenever the extension attaches. It detaches as soon
as the operation ends.*

Screenshot 3 is worth including even though it shows a warning banner: it
demonstrates to the reviewer that the `debugger` permission is used narrowly and
visibly, which is exactly the doubt they have when they see that permission
declared.
