import { z } from 'zod';
export function registerNetworkTool(server, bridge) {
    server.registerTool('alien_network', {
        description: 'Watch and read network requests',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            action: z.enum(['start', 'stop', 'getRequests']).describe('Action: start monitoring, stop, or get captured requests'),
            filter: z.object({
                urlPattern: z.string().optional(),
                method: z.string().optional(),
                type: z.string().optional(),
            }).optional().describe('Filter criteria for requests'),
        },
    }, async (args) => {
        const result = await bridge.send('network', args);
        if (args.action === 'getRequests' && result.requests) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Captured ${result.requests.length} requests:\n${JSON.stringify(result.requests, null, 2)}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Network monitoring ${args.action === 'start' ? 'started' : 'stopped'}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=network.js.map