type MessageHandler = (message: string, port: number) => void;

const BASE_PORT = 7888;
const MAX_PORT = 7899;
const SCAN_INTERVAL = 3000;
const INSTANCE_ID_KEY = 'alienmcp_instance_id';

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

/**
 * Stable per-installation identifier so the MCP server can distinguish two
 * extension instances (different Chrome profiles / windows) that report the
 * same `browser` string. Persisted in chrome.storage.local — survives SW
 * restarts and Chrome updates, only resets when the user reinstalls the
 * extension. Each profile has its own chrome.storage.local namespace, so
 * two profiles will naturally generate two different ids.
 */
async function getOrCreateInstanceId(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(INSTANCE_ID_KEY);
    const existing = stored[INSTANCE_ID_KEY];
    if (typeof existing === 'string' && existing.length > 0) return existing;
    // Fall back to a Math.random-based hex if crypto.randomUUID is unavailable.
    const fresh = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
    await chrome.storage.local.set({ [INSTANCE_ID_KEY]: fresh });
    return fresh;
  } catch {
    // chrome.storage may not be available in unusual contexts (e.g. tests);
    // a session-scoped id is still better than nothing.
    return `tmp-${Math.random().toString(16).slice(2, 18)}`;
  }
}

export class MultiWebSocketClient {
  private connections = new Map<number, Connection>();
  private handlers: MessageHandler[] = [];
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private _intentionalClose = false;
  private identity = detectBrowser();
  private instanceId: string | null = null;
  private instanceIdPromise: Promise<string> | null = null;

  /** Resolve and cache the instance id. Idempotent. */
  private async ensureInstanceId(): Promise<string> {
    if (this.instanceId) return this.instanceId;
    if (!this.instanceIdPromise) {
      this.instanceIdPromise = getOrCreateInstanceId().then((id) => {
        this.instanceId = id;
        return id;
      });
    }
    return this.instanceIdPromise;
  }

  connect(): void {
    this._intentionalClose = false;
    // Resolve the instance id eagerly so the first hello carries it. We
    // don't gate scanning on this — if the id is still pending when a
    // socket opens, sendHello() will await it before sending.
    void this.ensureInstanceId();
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

        // Resolve instanceId before sending hello so the server can
        // disambiguate this client from other extension instances reporting
        // the same browser name (e.g. two Chrome profiles).
        void this.ensureInstanceId().then((instanceId) => {
          try {
            ws.send(JSON.stringify({
              type: 'hello',
              browser: this.identity.browser,
              version: this.identity.version,
              instanceId,
            }));
          } catch (err) {
            console.warn('AlienMcp: failed to send hello', err);
          }
        });
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
