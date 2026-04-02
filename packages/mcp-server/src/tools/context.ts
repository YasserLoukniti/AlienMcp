import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../bridge.js';

export function registerContextTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_context',
    {
      description: 'Get current browser context: active tab info, tab count, connection status. Call this first to know where you are.',
    },
    async () => {
      const result = await bridge.send('context') as {
        activeTab: { id: number; url: string; title: string; favIconUrl: string };
        tabCount: number;
        windowId: number;
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `Active Tab: [${result.activeTab.id}] ${result.activeTab.title}`,
              `URL: ${result.activeTab.url}`,
              `Total tabs: ${result.tabCount}`,
              `Window: ${result.windowId}`,
            ].join('\n'),
          },
        ],
      };
    },
  );
}
