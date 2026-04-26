import { z } from 'zod';
export function registerConsoleTool(server, bridge) {
    server.registerTool('alien_console', {
        description: 'Read browser console messages',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            action: z.enum(['start', 'stop', 'getMessages']).describe('Action: start capturing, stop, or get messages'),
            level: z.enum(['log', 'warn', 'error', 'all']).optional().describe('Filter by log level'),
        },
    }, async (args) => {
        const result = await bridge.send('console', args);
        if (args.action === 'getMessages' && result.messages) {
            const msgs = result.messages
                .map((m) => `[${m.level.toUpperCase()}] ${new Date(m.timestamp).toISOString()} ${m.text}`)
                .join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `Console messages (${result.messages.length}):\n${msgs}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Console capture ${args.action === 'start' ? 'started' : 'stopped'}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=console.js.map