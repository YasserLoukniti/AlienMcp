import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerClickTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_click',
    {
      description: 'Click an element on the page by selector or coordinates. When using selector, the click dispatches a full mouse sequence (pointerdown/mousedown/pointerup/mouseup/click) so React/Radix/Framer handlers fire reliably. Pass `waitMs` to poll for the element to appear before clicking (SSR → hydration race).',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        selector: z.string().optional().describe('CSS selector of element to click'),
        x: z.number().optional().describe('X coordinate to click'),
        y: z.number().optional().describe('Y coordinate to click'),
        button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button'),
        waitMs: z.number().optional().describe('Max ms to poll for the selector before failing (default 0 = fail-fast)'),
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
