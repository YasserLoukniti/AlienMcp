# Privacy Policy - AlienMcp

**Last updated:** April 2, 2026

## Overview

AlienMcp is a browser automation extension that connects AI agents to your browser via the Model Context Protocol (MCP). This privacy policy explains how the extension handles your data.

## Data Collection

**AlienMcp does not collect, transmit, or store any personal data.**

All communication happens **locally** between:
- The Chrome extension running in your browser
- A local MCP server running on your machine (localhost:7888)

No data is sent to any external server, cloud service, or third party.

## What the Extension Accesses

When you explicitly use AlienMcp tools, the extension may access:

- **Tab information** (URLs, titles) - to display in the popup and respond to tool commands
- **Page content** (DOM, text) - when you use read_page, find_element, or similar tools
- **Screenshots** - when you use the screenshot tool
- **Cookies and storage** - when you use cookies or storage tools
- **Network requests** - when you enable network monitoring
- **Console messages** - when you enable console capture

All of this data stays on your machine and is only accessible to the MCP client (AI agent) you are using locally.

## Permissions

The extension requires the following Chrome permissions:

| Permission | Why |
|---|---|
| `tabs` | List and manage browser tabs |
| `activeTab` | Access the current active tab |
| `scripting` | Execute scripts for DOM interaction |
| `debugger` | Chrome DevTools Protocol for screenshots, JS execution, keyboard input, network monitoring |
| `webRequest` | Monitor network requests |
| `cookies` | Read and manage cookies |
| `storage` | Extension internal storage |
| `offscreen` | Keep WebSocket connection alive |
| `alarms` | Periodic keepalive for service worker |
| `tabGroups` | Manage tab groups for scoping |
| `<all_urls>` | Operate on any webpage |

## Data Retention

No data is persisted. All captured data (network requests, console messages) is held in memory only and cleared when the extension is reloaded or Chrome is restarted.

## Third-Party Services

AlienMcp does not integrate with any third-party analytics, tracking, or data collection services.

## Changes

We may update this privacy policy. Changes will be noted in the extension's changelog.

## Contact

For questions about this privacy policy, please open an issue on the GitHub repository.
