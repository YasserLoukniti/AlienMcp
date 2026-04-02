import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export interface BridgeRequest {
  id: string;
  command: string;
  args: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  data?: unknown;
  error?: string;
}

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class Bridge {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private port: number;
  private timeout: number;
  private _connected = false;

  constructor(port = 7888, timeout = 30000) {
    this.port = port;
    this.timeout = timeout;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', () => {
        console.error(`Bridge WebSocket server listening on ws://localhost:${this.port}`);
        resolve();
      });

      this.wss.on('error', (err) => {
        console.error('Bridge server error:', err.message);
        reject(err);
      });

      this.wss.on('connection', (ws) => {
        console.error('Chrome extension connected to bridge');

        // Only keep one client (the extension)
        if (this.client) {
          this.client.close();
        }

        this.client = ws;
        this._connected = true;

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            // Ignore pings
            if (message.type === 'ping') return;

            const response: BridgeResponse = message;
            this.handleResponse(response);
          } catch (err) {
            console.error('Failed to parse bridge message:', err);
          }
        });

        ws.on('close', () => {
          console.error('Chrome extension disconnected');
          this._connected = false;
          this.client = null;
          this.rejectAllPending('Chrome extension disconnected');
        });

        ws.on('error', (err) => {
          console.error('Client WebSocket error:', err.message);
        });
      });
    });
  }

  async send(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.client || !this._connected) {
      throw new Error('Chrome extension not connected. Make sure the AlienMcp extension is installed and active.');
    }

    const id = uuidv4();
    const request: BridgeRequest = { id, command, args };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Command "${command}" timed out after ${this.timeout}ms`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.client!.send(JSON.stringify(request));
    });
  }

  private handleResponse(response: BridgeResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response.data);
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this._connected;
  }

  stop(): void {
    this.rejectAllPending('Bridge closing');
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this._connected = false;
  }
}
