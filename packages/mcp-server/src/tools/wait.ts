import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerWaitTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_wait',
    {
      description: 'Wait for an element or text to appear on the page (useful for SPAs and dynamic content)',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
        selector: z.string().optional().describe('CSS selector to wait for'),
        text: z.string().optional().describe('Text content to wait for'),
        timeout: z.number().optional().describe('Max wait time in ms (default: 10000)'),
      },
    },
    async (args) => {
      const result = await bridge.send('wait', args) as {
        found: boolean;
        elapsed: number;
        element?: { tag: string; text: string };
      };

      if (!result.found) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Element not found after ${result.elapsed}ms timeout`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found <${result.element?.tag}> after ${result.elapsed}ms: "${result.element?.text?.slice(0, 100)}"`,
          },
        ],
      };
    },
  );
}
