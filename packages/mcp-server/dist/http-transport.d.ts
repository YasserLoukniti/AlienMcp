import { Bridge } from './bridge.js';
export interface HttpTransportOptions {
    port: number;
    host?: string;
}
export declare function startHttpTransport(bridge: Bridge, options: HttpTransportOptions): Promise<void>;
//# sourceMappingURL=http-transport.d.ts.map