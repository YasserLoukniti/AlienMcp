import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerScrollTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_scroll',
    {
      description: 'Scroll the page in a direction, by amount, or to a specific element',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
        direction: z.enum(['up', 'down', 'left', 'right', 'top', 'bottom']).optional().describe('Scroll direction (default: down)'),
        amount: z.number().optional().describe('Pixels to scroll (default: 500)'),
        selector: z.string().optional().describe('CSS selector to scroll into view (overrides direction/amount)'),
      },
    },
    async (args) => {
      const result = await bridge.send('scroll', args) as {
        success: boolean;
        scrollX: number;
        scrollY: number;
        pageHeight: number;
      };

      const pos = `scroll: ${result.scrollY}/${result.pageHeight}px`;
      return {
        content: [
          {
            type: 'text' as const,
            text: args.selector
              ? `Scrolled to "${args.selector}" (${pos})`
              : `Scrolled ${args.direction || 'down'} ${args.amount || 500}px (${pos})`,
          },
        ],
      };
    },
  );
}
