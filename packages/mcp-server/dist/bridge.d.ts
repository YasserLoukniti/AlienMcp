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
    getClients(): ClientInfo[];
    getSelectedBrowser(): string | null;
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