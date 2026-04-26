import { z } from 'zod';
export function registerReadPageTool(server, bridge) {
    server.registerTool('alien_read_page', {
        description: 'Read the page HTML source or text content',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            mode: z.enum(['html', 'text', 'selection']).optional().describe('Content mode: html source, text only, or selected text'),
            selector: z.string().optional().describe('CSS selector to read specific element'),
        },
    }, async (args) => {
        const result = await bridge.send('readPage', args);
        return {
            content: [
                {
                    type: 'text',
                    text: `URL: ${result.url}\nTitle: ${result.title}\n\n${result.content}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=read-page.js.map