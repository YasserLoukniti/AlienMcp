# Store listing copy

## Item name (45 char max)

    AlienMcp: Browser Control for Local AI

(38 characters.)

## Short description / summary (132 char max)

    Let the AI assistant on your own computer drive your browser: read pages, click, fill forms, screenshot. Nothing leaves your PC.

(129 characters.)

## Category

    Developer Tools

## Language

    English

## Detailed description

    AlienMcp connects an AI assistant running on your own computer to your own
    Chrome. Not a headless browser in a data centre: the actual tabs you are
    looking at, with your sessions and your logins already in place.

    It speaks the Model Context Protocol, so it works with any MCP client:
    Claude Code, Cursor, VS Code, and others.

    WHAT YOUR ASSISTANT CAN DO

    - See where you are: the active tab, its title and URL
    - Read a page: full text, HTML, or just the part you selected
    - Act on a page: click, type, hover, scroll, fill a form
    - Handle real apps: input is delivered as trusted events, so forms built on
      React, Vue or Angular behave exactly as if you had typed
    - Look closer: screenshot a tab, export it to PDF, read the console, list
      the network requests a page made
    - Find things: locate elements by CSS selector, visible text, XPath or ARIA
      role
    - Wait properly: pause until an element or a piece of text actually appears

    YOU DECIDE WHAT IT CAN TOUCH

    AlienMcp works inside a Chrome tab group that you create from its popup.
    Tabs outside the group do not exist as far as the extension is concerned.
    Drag a tab in when you want help with it, drag it out when you are done.

    NOTHING LEAVES YOUR MACHINE

    The extension talks to one place: a program listening on localhost, on your
    own computer. There is no account, no sign-in, no server of ours, no
    analytics and no telemetry. If that local program is not running, the
    extension does nothing at all.

    SETUP

    You need an MCP client on your machine. Installation instructions and the
    full source code are at https://github.com/YasserLoukniti/AlienMcp

## Assets to prepare

| Asset | Size | Required |
|---|---|---|
| Store icon | 128 x 128 PNG | yes (`icons/icon128.png` already exists) |
| Screenshot | 1280 x 800 or 640 x 400 PNG | yes, at least 1, up to 5 |
| Small promo tile | 440 x 280 PNG | optional |
| Marquee promo tile | 1400 x 560 PNG | optional |

Suggested screenshots, in this order:

1. The popup with a tab group active, showing the connected state.
2. A job board page next to the assistant transcript that drove it.
3. The Chrome debugging banner visible during a screenshot call, captioned to
   show the extension is transparent about when it attaches.

Screenshots must show the extension in use in Chrome. Do not use pure marketing
mockups: a listing whose screenshots do not depict the actual product is a
Yellow Zinc rejection.
