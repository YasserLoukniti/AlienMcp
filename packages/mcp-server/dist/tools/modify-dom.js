import { z } from 'zod';
export function registerModifyDomTool(server, bridge) {
    server.registerTool('alien_modify_dom', {
        description: 'Modify DOM elements on the page',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            selector: z.string().describe('CSS selector of elements to modify'),
            action: z.enum(['setAttribute', 'removeAttribute', 'setInnerHTML', 'setTextContent', 'setStyle', 'remove']).describe('Modification action'),
            attribute: z.string().optional().describe('Attribute name (for setAttribute/removeAttribute)'),
            value: z.string().optional().describe('Value to set'),
        },
    }, async (args) => {
        const result = await bridge.send('modifyDom', args);
        return {
            content: [
                {
                    type: 'text',
                    text: `Modified ${result.matchedElements} element(s) with action "${args.action}"`,
                },
            ],
        };
    });
}
//# sourceMappingURL=modify-dom.js.map