import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from './bridge.js';
export declare function createServer(bridge: Bridge): McpServer;
export interface StartServerOptions {
    transport?: 'stdio' | 'http';
    httpPort?: number;
    httpHost?: string;
}
export declare function startServer(options?: StartServerOptions): Promise<void>;
//# sourceMappingURL=server.d.ts.map