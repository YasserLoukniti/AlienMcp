type MessageHandler = (message: string, port: number) => void;

const BASE_PORT = 7888;
const MAX_PORT = 7899;
const SCAN_INTERVAL = 3000;

interface Connection {
  ws: WebSocket;
  port: number;
  connected: boolean;
}

function detectBrowser(): { browser: string; version?: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let match: RegExpMatchArray | null;
  if ((match = ua.match(/OPR\/(\S+)/)) || (match = ua.match(/Opera\/(\S+)/))) {
    return { browser: 'opera', version: match[1] };
  }
  if ((match = ua.match(/Edg\/(\S+)/))) {
    return { browser: 'edge', version: match[1] };
  }
  if ((match = ua.match(/Firefox\/(\S+)/))) {
    return { browser: 'firefox', version: match[1] };
  }
  if ((match = ua.match(/Chrome\/(\S+)/))) {
    return { browser: 'chrome', version: match[1] };
  }
  return { browser: 'unknown' };
}

export class MultiWebSocketClient {
  private connections = new Map<number, Connection>();
  private handlers: MessageHandler[] = [];
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private _intentionalClose = false;
  private identity = detectBrowser();

  connect(): void {
    this._intentionalClose = false;
    this.scanPorts();
    this.scanTimer = setInterval(() => this.scanPorts(), SCAN_INTERVAL);
  }

  /**
   * Scan all ports in the range and open a WebSocket to any that accepts.
   * Public so the service worker can trigger a re-scan on alarm wake-up —
   * MV3 suspension freezes the setInterval, so new MCP servers spawned while
   * the SW is idle stay invisible until the next scan trigger.
   */
  scanPorts(): void {
    for (let port = BASE_PORT; port <= MAX_PORT; port++) {
      if (this.connections.has(port)) continue;
      this.tryConnect(port);
    }
  }

  private tryConnect(port: number): void {
    try {
      const ws = new WebSocket(`ws://localhost:${port}`);

      const connectTimeout = setTimeout(() => {
        ws.close();
      }, 2000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        const conn: Connection = { ws, port, connected: true };
        this.connections.set(port, conn);
        console.log(`AlienMcp: Connected to port ${port} (${this.connectedCount()} sessions)`);

        try {
          ws.send(JSON.stringify({
            type: 'hello',
            browser: this.identity.browser,
            version: this.identity.version,
          }));
        } catch (err) {
          console.warn('AlienMcp: failed to send hello', err);
        }
      };

      ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : '';
        for (const handler of this.handlers) {
          handler(data, port);
        }
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
        if (this.connections.has(port)) {
          console.log(`AlienMcp: Disconnected from port ${port}`);
          this.connections.delete(port);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectTimeout);
      };
    } catch {
      // Ignore connection errors during scanning
    }
  }

  send(message: string, port: number): void {
    const conn = this.connections.get(port);
    if (conn?.connected) {
      conn.ws.send(message);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  isConnected(): boolean {
    return this.connectedCount() > 0;
  }

  connectedCount(): number {
    return this.connections.size;
  }

  getConnectedPorts(): number[] {
    return Array.from(this.connections.keys());
  }

  getIdentity(): { browser: string; version?: string } {
    return this.identity;
  }

  disconnect(): void {
    this._intentionalClose = true;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    for (const [, conn] of this.connections) {
      conn.ws.close();
    }
    this.connections.clear();
  }
}
