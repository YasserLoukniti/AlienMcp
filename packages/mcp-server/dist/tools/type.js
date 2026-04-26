import { z } from 'zod';
export function registerTypeTool(server, bridge) {
    server.registerTool('alien_type', {
        description: 'Type text with trusted keyboard events (via Chrome DevTools Protocol). Works with sites that reject synthetic input events.',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            text: z.string().describe('Text to type'),
            selector: z.string().optional().describe('CSS selector to focus before typing'),
            delay: z.number().optional().describe('Delay between keystrokes in ms (default: 30)'),
        },
    }, async (args) => {
        const result = await bridge.send('type', args);
        return {
            content: [
                {
                    type: 'text',
                    text: `Typed "${result.typed}" (${result.typed.length} chars)`,
                },
            ],
        };
    });
}
//# sourceMappingURL=type.js.map