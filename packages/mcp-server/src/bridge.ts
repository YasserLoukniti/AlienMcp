import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer, type Server } from 'net';

export const BASE_PORT = 7888;
export const MAX_PORT = 7899;

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
  targetBrowser: string;
}

export interface ClientInfo {
  browser: string;
  version?: string;
  /** Stable per-installation id reported by the extension (chrome.storage.local).
   *  Lets us tell apart two extensions of the same browser kind, e.g. one
   *  AlienMcp install per Chrome profile. */
  instanceId?: string;
  connectedAt: number;
}

/** Build the unique label used for routing. When no collision exists, this is
 *  just `browser` (backwards-compatible). When two clients share the same
 *  `browser` string, append `#<8 chars of instanceId>` so callers can pick
 *  one explicitly via `alien_browser use chrome#a1b2c3d4`. */
function uniqueLabelFor(info: ClientInfo, all: ClientInfo[]): string {
  const sameKind = all.filter((c) => c.browser === info.browser);
  if (sameKind.length <= 1) return info.browser;
  const id = info.instanceId ?? '';
  const suffix = id ? id.replace(/[^a-z0-9]/gi, '').slice(0, 8) : info.connectedAt.toString(36).slice(-6);
  return `${info.browser}#${suffix || 'unknown'}`;
}

interface ClientEntry {
  ws: WebSocket;
  info: ClientInfo;
}

async function findFreePort(base: number, max: number): Promise<number> {
  for (let port = base; port <= max; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const srv: Server = createServer();
      srv.once('error', () => resolve(false));
      srv.once('listening', () => {
        srv.close(() => resolve(true));
      });
      srv.listen(port);
    });
    if (free) return port;
  }
  throw new Error(`No free port found in range ${base}-${max}`);
}

export class Bridge {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientInfo>();
  private pendingRequests = new Map<string, PendingRequest>();
  private port: number;
  private actualPort: number | null = null;
  private timeout: number;
  private sessionId: string;
  private label: string;
  private selectedBrowser: string | null = null;

  constructor(port = BASE_PORT, timeout = 30000) {
    this.port = port;
    this.timeout = timeout;
    this.sessionId = uuidv4();
    this.label = this.sessionId.slice(0, 8);
  }

  async start(): Promise<void> {
    this.actualPort = await findFreePort(this.port, MAX_PORT);
    console.error(`Found free port: ${this.actualPort}`);

    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.actualPort! });

      this.wss.on('listening', () => {
        console.error(`Bridge WebSocket server listening on ws://localhost:${this.actualPort}`);
        console.error(`Session: ${this.sessionId} (label: ${this.label})`);
        resolve();
      });

      this.wss.on('error', (err) => {
        console.error('Bridge server error:', err.message);
        reject(err);
      });

      this.wss.on('connection', (ws) => {
        const entry: ClientInfo = {
          browser: 'unknown',
          connectedAt: Date.now(),
        };
        this.clients.set(ws, entry);
        console.error(`Client connected (${this.clients.size} total)`);

        // Send our hello with session metadata
        try {
          ws.send(JSON.stringify({
            type: 'hello',
            sessionId: this.sessionId,
            label: this.label,
          }));
        } catch (err) {
          console.error('Failed to send hello:', err);
        }

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.type === 'ping') return;

            if (message.type === 'hello') {
              entry.browser = typeof message.browser === 'string' ? message.browser : 'unknown';
              entry.version = typeof message.version === 'string' ? message.version : undefined;
              entry.instanceId = typeof message.instanceId === 'string' ? message.instanceId : undefined;
              console.error(`Client identified as ${entry.browser}${entry.version ? ' ' + entry.version : ''}${entry.instanceId ? ` [${entry.instanceId.slice(0, 8)}]` : ''}`);
              return;
            }

            const response: BridgeResponse = message;
            this.handleResponse(response);
          } catch (err) {
            console.error('Failed to parse bridge message:', err);
          }
        });

        ws.on('close', () => {
          const info = this.clients.get(ws);
          this.clients.delete(ws);
          console.error(`Client disconnected (${info?.browser ?? 'unknown'}, ${this.clients.size} remaining)`);
          if (this.clients.size === 0) {
            this.rejectAllPending('All clients disconnected');
          }
        });

        ws.on('error', (err) => {
          console.error('Client WebSocket error:', err.message);
        });
      });
    });
  }

  getPort(): number | null {
    return this.actualPort;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getLabel(): string {
    return this.label;
  }

  setLabel(label: string): void {
    const trimmed = label.trim();
    if (!trimmed) throw new Error('Label cannot be empty');
    this.label = trimmed;
    const msg = JSON.stringify({ type: 'relabel', sessionId: this.sessionId, label: this.label });
    for (const [ws] of this.clients) {
      try { ws.send(msg); } catch { /* ignore */ }
    }
  }

  /** Augment ClientInfo with the unique routing label (`browser` or
   *  `browser#xxxxxxxx` when multiple clients share the same kind). */
  getClients(): Array<ClientInfo & { label: string }> {
    const all = Array.from(this.clients.values());
    return all.map((info) => ({ ...info, label: uniqueLabelFor(info, all) }));
  }

  getSelectedBrowser(): string | null {
    return this.selectedBrowser;
  }

  /** Match by full label first (e.g. "chrome#a1b2c3d4"), then fall back to the
   *  bare `browser` kind. The bare-kind match keeps the legacy single-Chrome
   *  workflow working unchanged. */
  selectBrowser(browser: string): boolean {
    const all = Array.from(this.clients.values());
    const byLabel = all.find((c) => uniqueLabelFor(c, all) === browser);
    if (byLabel) {
      this.selectedBrowser = browser;
      return true;
    }
    const byKind = all.find((c) => c.browser === browser);
    if (byKind) {
      this.selectedBrowser = browser;
      return true;
    }
    return false;
  }

  clearSelection(): void {
    this.selectedBrowser = null;
  }

  private resolveTarget(): { ws: WebSocket; browser: string } {
    if (this.clients.size === 0) {
      throw new Error('No browser extension connected. Make sure the AlienMcp extension is installed and active.');
    }

    const entries = Array.from(this.clients.entries());
    const all = entries.map(([, info]) => info);

    if (this.selectedBrowser) {
      // Prefer label match (unique); fall back to first bare-kind match for
      // backwards compatibility with old client code that only knows "chrome".
      const byLabel = entries.find(([, info]) => uniqueLabelFor(info, all) === this.selectedBrowser);
      const byKind = byLabel ?? entries.find(([, info]) => info.browser === this.selectedBrowser);
      if (!byKind) {
        throw new Error(`Selected browser "${this.selectedBrowser}" is no longer connected. Call alien_browser with action "list" to see available browsers.`);
      }
      return { ws: byKind[0], browser: uniqueLabelFor(byKind[1], all) };
    }

    if (this.clients.size === 1) {
      const [ws, info] = entries[0];
      return { ws, browser: uniqueLabelFor(info, all) };
    }

    const labels = all.map((c) => uniqueLabelFor(c, all)).join(', ');
    throw new Error(`Multiple browsers connected (${labels}). Call alien_browser with action "use" to pick one.`);
  }

  async send(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const { ws, browser } = this.resolveTarget();

    const id = uuidv4();
    const request: BridgeRequest = { id, command, args };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Command "${command}" timed out after ${this.timeout}ms`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timer, targetBrowser: browser });
      ws.send(JSON.stringify(request));
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
    return this.clients.size > 0;
  }

  stop(): void {
    this.rejectAllPending('Bridge closing');
    for (const [ws] of this.clients) {
      try { ws.close(); } catch { /* ignore */ }
    }
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
