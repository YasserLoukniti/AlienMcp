import { z } from 'zod';
export function registerBrowserTool(server, bridge) {
    server.registerTool('alien_browser', {
        description: 'List connected browsers or pick one to route commands to. Use "list" to see what is available (e.g. chrome, opera). Use "use" with a browser name when more than one is connected — all subsequent commands will target that browser only. A single connected browser is auto-selected.',
        inputSchema: {
            action: z.enum(['list', 'use', 'clear']).describe('list available, use a specific one, or clear selection'),
            browser: z.string().optional().describe('Browser name (required for action "use"): chrome, opera, edge, firefox'),
        },
    }, async (args) => {
        if (args.action === 'list') {
            const clients = bridge.getClients();
            if (clients.length === 0) {
                return {
                    content: [{ type: 'text', text: 'No browser extensions connected.' }],
                };
            }
            const selected = bridge.getSelectedBrowser();
            const lines = clients.map((c) => {
                const marker = c.browser === selected ? '>' : ' ';
                const ver = c.version ? ` ${c.version}` : '';
                return `${marker} ${c.browser}${ver}`;
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Connected browsers:\n${lines.join('\n')}${selected ? `\nSelected: ${selected}` : '\nNo selection (auto-routes when only one connected).'}`,
                    },
                ],
            };
        }
        if (args.action === 'use') {
            if (!args.browser)
                throw new Error('browser is required when action is "use"');
            const ok = bridge.selectBrowser(args.browser);
            if (!ok) {
                const available = bridge.getClients().map((c) => c.browser).join(', ') || 'none';
                throw new Error(`Browser "${args.browser}" is not connected. Available: ${available}`);
            }
            return {
                content: [
                    { type: 'text', text: `Selected browser: ${args.browser}. All subsequent commands will target ${args.browser}.` },
                ],
            };
        }
        // clear
        bridge.clearSelection();
        return {
            content: [{ type: 'text', text: 'Browser selection cleared. Auto-routing if single browser connected.' }],
        };
    });
}
//# sourceMappingURL=browser.js.map