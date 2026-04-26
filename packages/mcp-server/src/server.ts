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
import { registerEmulateTool } from './tools/emulate.js';
import { registerSessionTool } from './tools/session.js';
import { registerBrowserTool } from './tools/browser.js';

export function createServer(bridge: Bridge): McpServer {
  const server = new McpServer({
    name: 'alien-mcp',
    version: '1.1.0',
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
  registerEmulateTool(server, bridge);
  registerSessionTool(server, bridge);
  registerBrowserTool(server, bridge);

  return server;
}

export interface StartServerOptions {
  transport?: 'stdio' | 'http';
  httpPort?: number;
  httpHost?: string;
}

export async function startServer(options: StartServerOptions = {}): Promise<void> {
  const { transport: transportKind = 'stdio', httpPort = 7890, httpHost = '127.0.0.1' } = options;

  const bridge = new Bridge();
  await bridge.start();

  console.error(`Waiting for Chrome extension to connect on port ${bridge.getPort()}...`);

  if (transportKind === 'http') {
    const { startHttpTransport } = await import('./http-transport.js');
    await startHttpTransport(bridge, { port: httpPort, host: httpHost });
  } else {
    const server = createServer(bridge);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('AlienMcp server running on stdio');
  }

  // Clean shutdown
  const cleanup = () => {
    bridge.stop();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
