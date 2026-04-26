import { z } from 'zod';
export function registerFindElementTool(server, bridge) {
    server.registerTool('alien_find_element', {
        description: 'Find elements on the page by selector, text, XPath, or ARIA role',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            selector: z.string().optional().describe('CSS selector'),
            text: z.string().optional().describe('Text content to search for'),
            xpath: z.string().optional().describe('XPath expression'),
            role: z.string().optional().describe('ARIA role'),
            limit: z.number().optional().describe('Max number of results'),
        },
    }, async (args) => {
        const result = await bridge.send('findElement', args);
        const summary = result.elements
            .map((el) => `[${el.index}] <${el.tag}> "${el.text.slice(0, 80)}" (${el.rect.x},${el.rect.y} ${el.rect.width}x${el.rect.height})`)
            .join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${result.elements.length} element(s):\n${summary}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=find-element.js.map