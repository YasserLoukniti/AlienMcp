import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Bridge } from './bridge.js';
import { registerScreenshotTool } from './tools/screenshot.js';
import { registerNavigateTool } from './tools/navigate.js';
import { registerClickTool } from './tools/click.js';
import { registerExecuteJsTool } from './tools/execute-js.js';
import { registerReadPageTool } from './tools/read-page.js';
import { registerModifyDomTool } from './tools/modify-dom.js';
import { registerNetworkTool } from './tools/network.js';
import { registerTabsTool } from './tools/tabs.js';
import { registerFindElementTool } from './tools/find-element.js';
import { registerConsoleTool } from './tools/console.js';
import { registerFormInputTool } from './tools/form-input.js';
import { registerContextTool } from './tools/context.js';
import { registerTypeTool } from './tools/type.js';
import { registerScrollTool } from './tools/scroll.js';
import { registerWaitTool } from './tools/wait.js';
import { registerHoverTool } from './tools/hover.js';
import { registerCookiesTool } from './tools/cookies.js';
import { registerStorageTool } from './tools/storage.js';
import { registerPdfTool } from './tools/pdf.js';

export function createServer(bridge: Bridge): McpServer {
  const server = new McpServer({
    name: 'alien-mcp',
    version: '1.0.0',
  });

  registerScreenshotTool(server, bridge);
  registerNavigateTool(server, bridge);
  registerClickTool(server, bridge);
  registerExecuteJsTool(server, bridge);
  registerReadPageTool(server, bridge);
  registerModifyDomTool(server, bridge);
  registerNetworkTool(server, bridge);
  registerTabsTool(server, bridge);
  registerFindElementTool(server, bridge);
  registerConsoleTool(server, bridge);
  registerFormInputTool(server, bridge);
  registerContextTool(server, bridge);
  registerTypeTool(server, bridge);
  registerScrollTool(server, bridge);
  registerWaitTool(server, bridge);
  registerHoverTool(server, bridge);
  registerCookiesTool(server, bridge);
  registerStorageTool(server, bridge);
  registerPdfTool(server, bridge);

  return server;
}

export async function startServer(): Promise<void> {
  const bridge = new Bridge(7888);
  await bridge.start();

  console.error('Waiting for Chrome extension to connect...');

  const server = createServer(bridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('AlienMcp server running on stdio');
}
