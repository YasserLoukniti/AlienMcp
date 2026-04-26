import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerTabsTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_tabs',
    {
      description: 'Manage browser tabs (list, create, close, activate)',
      inputSchema: {
        action: z.enum(['list', 'create', 'close', 'activate']).describe('Tab action'),
        url: z.string().optional().describe('URL for new tab (create action)'),
        tabId: z.number().optional().describe('Tab ID (for close/activate)'),
        active: z.boolean().optional().describe('For create: open in foreground (default: true). Pass false to open a background tab without stealing focus — useful for headless automation.'),
      },
    },
    async (args) => {
      const result = await bridge.send('tabs', args) as {
        tabs?: Array<{ id: number; url: string; title: string; active: boolean }>;
        tab?: { id: number; url: string; title: string };
      };

      if (args.action === 'list' && result.tabs) {
        const tabList = result.tabs
          .map((t) => `${t.active ? '>' : ' '} [${t.id}] ${t.title} - ${t.url}`)
          .join('\n');
        return {
          content: [{ type: 'text' as const, text: `Open tabs:\n${tabList}` }],
        };
      }

      if (result.tab) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Tab ${args.action}d: [${result.tab.id}] ${result.tab.title}`,
            },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: `Tab action "${args.action}" completed` }],
      };
    },
  );
}
