import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerClickTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_click',
    {
      description: 'Click an element on the page by selector or coordinates',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        selector: z.string().optional().describe('CSS selector of element to click'),
        x: z.number().optional().describe('X coordinate to click'),
        y: z.number().optional().describe('Y coordinate to click'),
        button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button'),
      },
    },
    async (args) => {
      const result = await bridge.send('click', args) as {
        success: boolean;
        element?: { tag: string; text: string };
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: result.element
              ? `Clicked <${result.element.tag}>: "${result.element.text}"`
              : `Click executed at (${args.x}, ${args.y})`,
          },
        ],
      };
    },
  );
}
