import express from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
export async function startHttpTransport(bridge, options) {
    const { port, host = '127.0.0.1' } = options;
    const app = express();
    app.use(cors({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Content-Type', 'Mcp-Session-Id'],
    }));
    // 50 MB cap. Default express.json() is 100 KB which kills any tool call
    // that ships a base64-encoded file (CV PDF ~150 KB, screenshot ~1-3 MB,
    // page HTML ~500 KB on heavy SPAs). 50 MB covers all real cases without
    // opening up an obvious DoS vector — the daemon is bound to localhost.
    app.use(express.json({ limit: '50mb' }));
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            extensionConnected: bridge.isConnected(),
            bridgePort: bridge.getPort(),
        });
    });
    const handleMcpRequest = async (req, res) => {
        try {
            const server = createServer(bridge);
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            res.on('close', () => {
                transport.close();
                server.close();
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        }
        catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'Internal server error' },
                    id: null,
                });
            }
        }
    };
    app.post('/mcp', handleMcpRequest);
    const methodNotAllowed = (_req, res) => {
        res.status(405).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed (stateless mode).' },
            id: null,
        });
    };
    app.get('/mcp', methodNotAllowed);
    app.delete('/mcp', methodNotAllowed);
    await new Promise((resolve, reject) => {
        const httpServer = app.listen(port, host, () => {
            console.error(`AlienMcp HTTP transport listening on http://${host}:${port}/mcp`);
            resolve();
        });
        httpServer.on('error', reject);
    });
}
//# sourceMappingURL=http-transport.js.map