import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerExecuteJsTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_execute_js',
    {
      description: 'Execute JavaScript in the page context',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        code: z.string().describe('JavaScript code to execute'),
        world: z.enum(['MAIN', 'ISOLATED']).optional().describe('Execution world (MAIN to access page variables)'),
      },
    },
    async (args) => {
      const result = await bridge.send('executeJs', args) as {
        result: unknown;
        error?: string;
      };

      if (result.error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result.result === 'string'
              ? result.result
              : JSON.stringify(result.result, null, 2),
          },
        ],
      };
    },
  );
}
