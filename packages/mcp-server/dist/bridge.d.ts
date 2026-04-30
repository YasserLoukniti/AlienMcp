export declare const BASE_PORT = 7888;
export declare const MAX_PORT = 7899;
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
export interface ClientInfo {
    browser: string;
    version?: string;
    /** Stable per-installation id reported by the extension (chrome.storage.local).
     *  Lets us tell apart two extensions of the same browser kind, e.g. one
     *  AlienMcp install per Chrome profile. */
    instanceId?: string;
    connectedAt: number;
}
export declare class Bridge {
    private wss;
    private clients;
    private pendingRequests;
    private port;
    private actualPort;
    private timeout;
    private sessionId;
    private label;
    private selectedBrowser;
    constructor(port?: number, timeout?: number);
    start(): Promise<void>;
    getPort(): number | null;
    getSessionId(): string;
    getLabel(): string;
    setLabel(label: string): void;
    /** Augment ClientInfo with the unique routing label (`browser` or
     *  `browser#xxxxxxxx` when multiple clients share the same kind). */
    getClients(): Array<ClientInfo & {
        label: string;
    }>;
    getSelectedBrowser(): string | null;
    /** Match by full label first (e.g. "chrome#a1b2c3d4"), then fall back to the
     *  bare `browser` kind. The bare-kind match keeps the legacy single-Chrome
     *  workflow working unchanged. */
    selectBrowser(browser: string): boolean;
    clearSelection(): void;
    private resolveTarget;
    send(command: string, args?: Record<string, unknown>): Promise<unknown>;
    private handleResponse;
    private rejectAllPending;
    isConnected(): boolean;
    stop(): void;
}
//# sourceMappingURL=bridge.d.ts.map