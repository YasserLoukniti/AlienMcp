import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerScreenshotTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_screenshot',
    {
      description: 'Capture a screenshot of the visible tab',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID to capture (default: active tab)'),
        format: z.enum(['png', 'jpeg']).optional().describe('Image format'),
        quality: z.number().min(0).max(100).optional().describe('JPEG quality (0-100)'),
        fullPage: z.boolean().optional().describe('Capture full page (not just viewport)'),
      },
    },
    async (args) => {
      const result = await bridge.send('screenshot', args) as {
        image: string;
        width: number;
        height: number;
        url: string;
        title: string;
      };

      return {
        content: [
          {
            type: 'image' as const,
            data: result.image,
            mimeType: args.format === 'jpeg' ? 'image/jpeg' : 'image/png',
          },
          {
            type: 'text' as const,
            text: `Screenshot: ${result.width}x${result.height}\nTab: ${result.title}\nURL: ${result.url}`,
          },
        ],
      };
    },
  );
}
