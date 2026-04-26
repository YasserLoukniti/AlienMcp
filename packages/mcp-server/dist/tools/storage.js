import { z } from 'zod';
export function registerStorageTool(server, bridge) {
    server.registerTool('alien_storage', {
        description: 'Read/write localStorage or sessionStorage',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
            action: z.enum(['getAll', 'get', 'set', 'remove', 'clear', 'keys']).optional().describe('Action (default: getAll)'),
            type: z.enum(['local', 'session']).optional().describe('Storage type (default: local)'),
            key: z.string().optional().describe('Storage key'),
            value: z.string().optional().describe('Value to set'),
        },
    }, async (args) => {
        const result = await bridge.send('storage', args);
        if (result.data) {
            const data = result.data;
            const entries = Object.entries(data);
            const list = entries.slice(0, 20).map(([k, v]) => {
                const val = typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80);
                return `${k}: ${val}`;
            }).join('\n');
            return {
                content: [{ type: 'text', text: `${entries.length} entries:\n${list}${entries.length > 20 ? '\n...' : ''}` }],
            };
        }
        if (result.value !== undefined) {
            return {
                content: [{ type: 'text', text: `${args.key}: ${JSON.stringify(result.value)}` }],
            };
        }
        if (result.keys) {
            return {
                content: [{ type: 'text', text: `Keys: ${result.keys.join(', ')}` }],
            };
        }
        return {
            content: [{ type: 'text', text: result.success ? 'Done' : 'Failed' }],
        };
    });
}
//# sourceMappingURL=storage.js.map