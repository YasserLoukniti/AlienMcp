import { z } from 'zod';
export function registerSessionTool(server, bridge) {
    server.registerTool('alien_session', {
        description: 'Get or set this Claude session label. The label names the browser Tab Group reserved for this Claude, so multiple Claude instances do not share tabs. Call with action "set" and a short descriptive label (e.g. "jobs-indeed", "auth-debug") at the start of a browser task.',
        inputSchema: {
            action: z.enum(['get', 'set']).describe('get current label or set a new one'),
            label: z.string().optional().describe('New label (required for action "set")'),
        },
    }, async (args) => {
        if (args.action === 'set') {
            if (!args.label)
                throw new Error('label is required when action is "set"');
            bridge.setLabel(args.label);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Session label set to "${bridge.getLabel()}". Tab group renamed to "AlienMcp · ${bridge.getLabel()}".`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Session id: ${bridge.getSessionId()}\nLabel: ${bridge.getLabel()}\nTab group: AlienMcp · ${bridge.getLabel()}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=session.js.map