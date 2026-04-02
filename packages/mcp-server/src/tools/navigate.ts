import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerNavigateTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_navigate',
    {
      description: 'Navigate a tab to a URL',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        url: z.string().url().describe('URL to navigate to'),
        waitForLoad: z.boolean().optional().describe('Wait for page load to complete'),
      },
    },
    async (args) => {
      const result = await bridge.send('navigate', args) as {
        success: boolean;
        url: string;
        title: string;
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `Navigated to: ${result.url}\nTitle: ${result.title}`,
          },
        ],
      };
    },
  );
}
