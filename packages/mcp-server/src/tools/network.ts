import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerNetworkTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_network',
    {
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
    },
    async (args) => {
      const result = await bridge.send('network', args) as {
        requests?: Array<{
          url: string;
          method: string;
          status: number;
          type: string;
          size: number;
          duration: number;
        }>;
        monitoring?: boolean;
      };

      if (args.action === 'getRequests' && result.requests) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Captured ${result.requests.length} requests:\n${JSON.stringify(result.requests, null, 2)}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Network monitoring ${args.action === 'start' ? 'started' : 'stopped'}`,
          },
        ],
      };
    },
  );
}
