import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerTypeTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_type',
    {
      description: 'Type text with trusted keyboard events (via Chrome DevTools Protocol). Works with sites that reject synthetic input events.',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        text: z.string().describe('Text to type'),
        selector: z.string().optional().describe('CSS selector to focus before typing'),
        delay: z.number().optional().describe('Delay between keystrokes in ms (default: 30)'),
      },
    },
    async (args) => {
      const result = await bridge.send('type', args) as {
        success: boolean;
        typed: string;
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `Typed "${result.typed}" (${result.typed.length} chars)`,
          },
        ],
      };
    },
  );
}
