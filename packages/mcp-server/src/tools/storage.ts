import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerStorageTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_storage',
    {
      description: 'Read/write localStorage or sessionStorage',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
        action: z.enum(['getAll', 'get', 'set', 'remove', 'clear', 'keys']).optional().describe('Action (default: getAll)'),
        type: z.enum(['local', 'session']).optional().describe('Storage type (default: local)'),
        key: z.string().optional().describe('Storage key'),
        value: z.string().optional().describe('Value to set'),
      },
    },
    async (args) => {
      const result = await bridge.send('storage', args) as Record<string, unknown>;

      if (result.data) {
        const data = result.data as Record<string, unknown>;
        const entries = Object.entries(data);
        const list = entries.slice(0, 20).map(([k, v]) => {
          const val = typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80);
          return `${k}: ${val}`;
        }).join('\n');
        return {
          content: [{ type: 'text' as const, text: `${entries.length} entries:\n${list}${entries.length > 20 ? '\n...' : ''}` }],
        };
      }

      if (result.value !== undefined) {
        return {
          content: [{ type: 'text' as const, text: `${args.key}: ${JSON.stringify(result.value)}` }],
        };
      }

      if (result.keys) {
        return {
          content: [{ type: 'text' as const, text: `Keys: ${(result.keys as string[]).join(', ')}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: result.success ? 'Done' : 'Failed' }],
      };
    },
  );
}
