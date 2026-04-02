type MessageHandler = (message: string) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private _connected = false;
  private _intentionalClose = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this._intentionalClose = false;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this._connected = true;
        this.reconnectAttempts = 0;
        console.log(`AlienMcp: Connected to ${this.url}`);
      };

      this.ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : '';
        for (const handler of this.handlers) {
          handler(data);
        }
      };

      this.ws.onclose = () => {
        this._connected = false;
        console.log('AlienMcp: Disconnected');
        if (!this._intentionalClose) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('AlienMcp: WebSocket error', err);
      };
    } catch (err) {
      console.error('AlienMcp: Failed to connect', err);
      this.attemptReconnect();
    }
  }

  send(message: string): void {
    if (this.ws && this._connected) {
      this.ws.send(message);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  isConnected(): boolean {
    return this._connected;
  }

  disconnect(): void {
    this._intentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this._connected = false;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('AlienMcp: Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`AlienMcp: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
}
