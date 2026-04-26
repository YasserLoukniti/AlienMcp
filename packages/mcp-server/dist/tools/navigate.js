import { z } from 'zod';
export function registerNavigateTool(server, bridge) {
    server.registerTool('alien_navigate', {
        description: 'Navigate a tab to a URL',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            url: z.string().url().describe('URL to navigate to'),
            waitForLoad: z.boolean().optional().describe('Wait for page load to complete'),
        },
    }, async (args) => {
        const result = await bridge.send('navigate', args);
        return {
            content: [
                {
                    type: 'text',
                    text: `Navigated to: ${result.url}\nTitle: ${result.title}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=navigate.js.map