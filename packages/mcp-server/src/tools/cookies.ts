import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerCookiesTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_cookies',
    {
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
    },
    async (args) => {
      const result = await bridge.send('cookies', args) as Record<string, unknown>;

      if (result.cookies) {
        const cookies = result.cookies as Array<{ name: string; value: string; domain: string }>;
        const list = cookies.map((c) => `${c.name}=${c.value.slice(0, 50)}${c.value.length > 50 ? '...' : ''} (${c.domain})`).join('\n');
        return {
          content: [{ type: 'text' as const, text: `${cookies.length} cookies:\n${list}` }],
        };
      }

      if (result.cookie) {
        const c = result.cookie as { name: string; value: string };
        return {
          content: [{ type: 'text' as const, text: `${c.name}=${c.value}` }],
        };
      }

      if (result.deleted) {
        return {
          content: [{ type: 'text' as const, text: `Cookie "${args.name}" deleted` }],
        };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
