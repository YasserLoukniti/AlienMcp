import { z } from 'zod';
export function registerExecuteJsTool(server, bridge) {
    server.registerTool('alien_execute_js', {
        description: 'Execute JavaScript in the page context',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            code: z.string().describe('JavaScript code to execute'),
            world: z.enum(['MAIN', 'ISOLATED']).optional().describe('Execution world (MAIN to access page variables)'),
        },
    }, async (args) => {
        const result = await bridge.send('executeJs', args);
        if (result.error) {
            return {
                content: [{ type: 'text', text: `Error: ${result.error}` }],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: typeof result.result === 'string'
                        ? result.result
                        : JSON.stringify(result.result, null, 2),
                },
            ],
        };
    });
}
//# sourceMappingURL=execute-js.js.map