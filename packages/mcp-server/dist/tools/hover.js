import { z } from 'zod';
export function registerHoverTool(server, bridge) {
    server.registerTool('alien_hover', {
        description: 'Hover over an element (triggers tooltips, dropdowns, CSS :hover effects)',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
            selector: z.string().optional().describe('CSS selector to hover'),
            x: z.number().optional().describe('X coordinate to hover'),
            y: z.number().optional().describe('Y coordinate to hover'),
        },
    }, async (args) => {
        const result = await bridge.send('hover', args);
        if (result.element) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Hovering <${result.element.tag}> "${result.element.text.slice(0, 80)}" at (${result.element.rect.x}, ${result.element.rect.y})`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Hovering at (${args.x}, ${args.y})`,
                },
            ],
        };
    });
}
//# sourceMappingURL=hover.js.map