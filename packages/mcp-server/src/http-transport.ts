import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Bridge } from './bridge.js';
import { createServer } from './server.js';

export interface HttpTransportOptions {
  port: number;
  host?: string;
}

export async function startHttpTransport(bridge: Bridge, options: HttpTransportOptions): Promise<void> {
  const { port, host = '127.0.0.1' } = options;
  const app = express();

  app.use(
    cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'Mcp-Session-Id'],
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      extensionConnected: bridge.isConnected(),
      bridgePort: bridge.getPort(),
    });
  });

  const handleMcpRequest = async (req: Request, res: Response) => {
    try {
      const server = createServer(bridge);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      res.on('close', () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
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

  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed (stateless mode).' },
      id: null,
    });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  await new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(port, host, () => {
      console.error(`AlienMcp HTTP transport listening on http://${host}:${port}/mcp`);
      resolve();
    });
    httpServer.on('error', reject);
  });
}
