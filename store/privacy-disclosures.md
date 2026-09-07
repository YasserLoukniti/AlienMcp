# Privacy practices tab — answers to fill in

## Privacy policy URL

    https://alien-mcp.com/privacy

This URL must be live and publicly reachable **before** submitting; a 404 here is
an automatic rejection. Serve the contents of `PRIVACY.md` at that path.

## Data usage: what to tick

Declare what the extension *handles*, not only what it sends away. Under
declaring is a policy violation; over declaring is not. Tick:

- **Website content** — page text, DOM and screenshots are read when the user
  issues a tool call.
- **Authentication information** — cookie values can be read by `alien_cookies`.
- **User activity** — the tab the user is on, and network/console output of a
  page while monitoring is on.

Leave unticked: personally identifiable information, health information,
financial and payment information, personal communications, location.

For each ticked item, use this explanation:

> Read only while the user's own MCP client, running on the same machine, issues
> a tool call. The data is returned over a loopback WebSocket
> (ws://localhost:7888-7899) to that local client and is not persisted by the
> extension, not sent to any server operated by the developer, and not shared
> with any third party.

## The three certifications

All three can be certified truthfully:

1. I do not sell or transfer user data to third parties, outside of the approved
   use cases. ✅
2. I do not use or transfer user data for purposes that are unrelated to my
   item's single purpose. ✅
3. I do not use or transfer user data to determine creditworthiness or for
   lending purposes. ✅
