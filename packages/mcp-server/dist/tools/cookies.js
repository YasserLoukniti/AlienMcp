import { z } from 'zod';
export function registerCookiesTool(server, bridge) {
    server.registerTool('alien_cookies', {
        description: 'Read, set, or delete cookies for the current page',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
            action: z.enum(['getAll', 'get', 'set', 'delete']).optional().describe('Action (default: getAll)'),
            name: z.string().optional().describe('Cookie name (required for get/set/delete)'),
            value: z.string().optional().describe('Cookie value (required for set)'),
            url: z.string().optional().describe('URL scope (default: current tab URL)'),
            path: z.string().optional().describe('Cookie path (default: /)'),
            secure: z.boolean().optional().describe('Secure flag'),
            httpOnly: z.boolean().optional().describe('HttpOnly flag'),
        },
    }, async (args) => {
        const result = await bridge.send('cookies', args);
        if (result.cookies) {
            const cookies = result.cookies;
            const list = cookies.map((c) => `${c.name}=${c.value.slice(0, 50)}${c.value.length > 50 ? '...' : ''} (${c.domain})`).join('\n');
            return {
                content: [{ type: 'text', text: `${cookies.length} cookies:\n${list}` }],
            };
        }
        if (result.cookie) {
            const c = result.cookie;
            return {
                content: [{ type: 'text', text: `${c.name}=${c.value}` }],
            };
        }
        if (result.deleted) {
            return {
                content: [{ type: 'text', text: `Cookie "${args.name}" deleted` }],
            };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    });
}
//# sourceMappingURL=cookies.js.map