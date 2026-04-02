# AlienMcp - Browser Automation for AI Agents

Connect AI agents (Claude Code, Cursor, etc.) to your real browser via the Model Context Protocol (MCP).

Unlike headless browser automation, AlienMcp controls **your actual Chrome tabs** - with your sessions, cookies, and extensions intact.

## Features

- **19 MCP tools** for complete browser automation
- **Tab Groups** - scope tools to only the tabs you select
- **Debugger session manager** - no conflicts between concurrent CDP operations
- **Works with any MCP client** - Claude Code, Cursor, VS Code, etc.

### Tools

| Tool | Description |
|------|-------------|
| `alien_context` | Get active tab info and group overview |
| `alien_tabs` | List, create, close, activate tabs (scoped to group) |
| `alien_screenshot` | Capture visible tab or full page |
| `alien_navigate` | Navigate to a URL |
| `alien_click` | Click by CSS selector or coordinates (CDP trusted events) |
| `alien_type` | Type text with trusted keyboard events |
| `alien_hover` | Hover over elements (tooltips, dropdowns) |
| `alien_scroll` | Scroll by direction, amount, or to an element |
| `alien_wait` | Wait for an element or text to appear |
| `alien_execute_js` | Execute JavaScript via CDP (bypasses CSP) |
| `alien_read_page` | Read page HTML, text, or selected content |
| `alien_modify_dom` | Modify DOM elements (attributes, text, style, remove) |
| `alien_find_element` | Find elements by selector, text, XPath, or ARIA role |
| `alien_form_input` | Fill forms (works with React/Vue/Angular) |
| `alien_network` | Monitor network requests |
| `alien_console` | Capture browser console messages |
| `alien_cookies` | Read, set, delete cookies |
| `alien_storage` | Read/write localStorage and sessionStorage |
| `alien_pdf` | Generate PDF of the current page |

## Installation

### 1. Install the Chrome Extension

```bash
cd packages/chrome-extension
npm install
npm run build
```

Then load in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `packages/chrome-extension/dist` folder

### 2. Install the MCP Server

```bash
cd packages/mcp-server
npm install
npm run build
```

### 3. Register with Claude Code

```bash
claude mcp add alienMcp --transport stdio -s user -- node /path/to/alienMcp/packages/mcp-server/dist/index.js
```

Or for other MCP clients, add to your config:

```json
{
  "mcpServers": {
    "alienMcp": {
      "command": "node",
      "args": ["/path/to/alienMcp/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### 4. Restart your MCP client

The extension auto-connects when the MCP server starts.

## Usage

### Tab Groups

AlienMcp uses Chrome Tab Groups to scope which tabs the AI can see and interact with:

1. Click the AlienMcp extension icon in Chrome
2. Click **+ Add tab** to add the current tab to the "AlienMcp" group
3. Use the **+/-** buttons to manage tabs in the group
4. AI tools will only operate on tabs within the group

If no group exists, tools fall back to the active tab.

### Quick Start

Once connected, ask your AI agent:

```
"Take a screenshot of the current page"
"Find all buttons on the page"
"Click the submit button"
"Fill the email field with test@example.com"
"Read the page content"
"Navigate to https://example.com"
```

## Architecture

```
AI Agent (Claude Code, Cursor, etc.)
    |
    | MCP protocol (stdio, JSON-RPC 2.0)
    v
AlienMcp Server (Node.js)
    |
    | WebSocket (ws://localhost:7888)
    v
AlienMcp Chrome Extension (Manifest V3)
    |
    | chrome.tabs / chrome.scripting / chrome.debugger APIs
    v
Your Browser Tabs
```

## Development

```bash
# Install all dependencies
npm install

# Run MCP server tests
npm run test:server

# Run extension tests
npm run test:extension

# Build everything
npm run build
```

## Tech Stack

- **TypeScript** (strict mode)
- **MCP SDK** (`@modelcontextprotocol/sdk`)
- **Chrome Extension** Manifest V3
- **WebSocket** (`ws`) for bridge communication
- **Vitest** for testing
- **Webpack** for extension bundling
- **Zod** for schema validation

## License

MIT
