import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerReadPageTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_read_page',
    {
      description: 'Read the page HTML source or text content',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        mode: z.enum(['html', 'text', 'selection']).optional().describe('Content mode: html source, text only, or selected text'),
        selector: z.string().optional().describe('CSS selector to read specific element'),
      },
    },
    async (args) => {
      const result = await bridge.send('readPage', args) as {
        content: string;
        url: string;
        title: string;
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `URL: ${result.url}\nTitle: ${result.title}\n\n${result.content}`,
          },
        ],
      };
    },
  );
}
