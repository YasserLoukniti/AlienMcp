import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'net';
export const BASE_PORT = 7888;
export const MAX_PORT = 7899;
async function findFreePort(base, max) {
    for (let port = base; port <= max; port++) {
        const free = await new Promise((resolve) => {
            const srv = createServer();
            srv.once('error', () => resolve(false));
            srv.once('listening', () => {
                srv.close(() => resolve(true));
            });
            srv.listen(port);
        });
        if (free)
            return port;
    }
    throw new Error(`No free port found in range ${base}-${max}`);
}
export class Bridge {
    wss = null;
    clients = new Map();
    pendingRequests = new Map();
    port;
    actualPort = null;
    timeout;
    sessionId;
    label;
    selectedBrowser = null;
    constructor(port = BASE_PORT, timeout = 30000) {
        this.port = port;
        this.timeout = timeout;
        this.sessionId = uuidv4();
        this.label = this.sessionId.slice(0, 8);
    }
    async start() {
        this.actualPort = await findFreePort(this.port, MAX_PORT);
        console.error(`Found free port: ${this.actualPort}`);
        return new Promise((resolve, reject) => {
            this.wss = new WebSocketServer({ port: this.actualPort });
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
                const entry = {
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
                }
                catch (err) {
                    console.error('Failed to send hello:', err);
                }
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'ping')
                            return;
                        if (message.type === 'hello') {
                            entry.browser = typeof message.browser === 'string' ? message.browser : 'unknown';
                            entry.version = typeof message.version === 'string' ? message.version : undefined;
                            console.error(`Client identified as ${entry.browser}${entry.version ? ' ' + entry.version : ''}`);
                            return;
                        }
                        const response = message;
                        this.handleResponse(response);
                    }
                    catch (err) {
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
    getPort() {
        return this.actualPort;
    }
    getSessionId() {
        return this.sessionId;
    }
    getLabel() {
        return this.label;
    }
    setLabel(label) {
        const trimmed = label.trim();
        if (!trimmed)
            throw new Error('Label cannot be empty');
        this.label = trimmed;
        const msg = JSON.stringify({ type: 'relabel', sessionId: this.sessionId, label: this.label });
        for (const [ws] of this.clients) {
            try {
                ws.send(msg);
            }
            catch { /* ignore */ }
        }
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getSelectedBrowser() {
        return this.selectedBrowser;
    }
    selectBrowser(browser) {
        const match = Array.from(this.clients.values()).find((c) => c.browser === browser);
        if (!match)
            return false;
        this.selectedBrowser = browser;
        return true;
    }
    clearSelection() {
        this.selectedBrowser = null;
    }
    resolveTarget() {
        if (this.clients.size === 0) {
            throw new Error('No browser extension connected. Make sure the AlienMcp extension is installed and active.');
        }
        if (this.selectedBrowser) {
            const entry = Array.from(this.clients.entries()).find(([, info]) => info.browser === this.selectedBrowser);
            if (!entry) {
                throw new Error(`Selected browser "${this.selectedBrowser}" is no longer connected. Call alien_browser with action "list" to see available browsers.`);
            }
            return { ws: entry[0], browser: entry[1].browser };
        }
        if (this.clients.size === 1) {
            const [[ws, info]] = Array.from(this.clients.entries());
            return { ws, browser: info.browser };
        }
        const browsers = Array.from(this.clients.values()).map((c) => c.browser).join(', ');
        throw new Error(`Multiple browsers connected (${browsers}). Call alien_browser with action "use" to pick one.`);
    }
    async send(command, args = {}) {
        const { ws, browser } = this.resolveTarget();
        const id = uuidv4();
        const request = { id, command, args };
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Command "${command}" timed out after ${this.timeout}ms`));
            }, this.timeout);
            this.pendingRequests.set(id, { resolve, reject, timer, targetBrowser: browser });
            ws.send(JSON.stringify(request));
        });
    }
    handleResponse(response) {
        const pending = this.pendingRequests.get(response.id);
        if (!pending)
            return;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(response.id);
        if (response.error) {
            pending.reject(new Error(response.error));
        }
        else {
            pending.resolve(response.data);
        }
    }
    rejectAllPending(reason) {
        for (const [, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
            pending.reject(new Error(reason));
        }
        this.pendingRequests.clear();
    }
    isConnected() {
        return this.clients.size > 0;
    }
    stop() {
        this.rejectAllPending('Bridge closing');
        for (const [ws] of this.clients) {
            try {
                ws.close();
            }
            catch { /* ignore */ }
        }
        this.clients.clear();
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
    }
}
//# sourceMappingURL=bridge.js.map