import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerConsoleTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_console',
    {
      description: 'Read browser console messages',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        action: z.enum(['start', 'stop', 'getMessages']).describe('Action: start capturing, stop, or get messages'),
        level: z.enum(['log', 'warn', 'error', 'all']).optional().describe('Filter by log level'),
      },
    },
    async (args) => {
      const result = await bridge.send('console', args) as {
        messages?: Array<{
          level: string;
          text: string;
          timestamp: number;
          source: string;
        }>;
        capturing?: boolean;
      };

      if (args.action === 'getMessages' && result.messages) {
        const msgs = result.messages
          .map((m) => `[${m.level.toUpperCase()}] ${new Date(m.timestamp).toISOString()} ${m.text}`)
          .join('\n');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Console messages (${result.messages.length}):\n${msgs}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Console capture ${args.action === 'start' ? 'started' : 'stopped'}`,
          },
        ],
      };
    },
  );
}
