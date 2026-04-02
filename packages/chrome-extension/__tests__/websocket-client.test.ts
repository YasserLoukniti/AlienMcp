import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket globally (browser-style)
let mockWsInstance: {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((err: unknown) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

const MockWebSocket = vi.fn().mockImplementation(() => {
  mockWsInstance = {
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    send: vi.fn(),
    close: vi.fn(),
  };
  return mockWsInstance;
});

vi.stubGlobal('WebSocket', MockWebSocket);

const { WebSocketClient } = await import('../src/background/websocket-client');

describe('WebSocketClient', () => {
  let client: InstanceType<typeof WebSocketClient>;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new WebSocketClient('ws://localhost:7888');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should connect to WebSocket server', () => {
    client.connect();

    expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:7888');
    expect(client.isConnected()).toBe(false);

    // Simulate connection
    mockWsInstance.onopen!();
    expect(client.isConnected()).toBe(true);
  });

  it('should send messages when connected', () => {
    client.connect();
    mockWsInstance.onopen!();

    client.send('hello');
    expect(mockWsInstance.send).toHaveBeenCalledWith('hello');
  });

  it('should not send when disconnected', () => {
    client.connect();
    // Don't trigger onopen
    client.send('hello');
    expect(mockWsInstance.send).not.toHaveBeenCalled();
  });

  it('should handle incoming messages', () => {
    const handler = vi.fn();
    client.onMessage(handler);
    client.connect();
    mockWsInstance.onopen!();

    mockWsInstance.onmessage!({ data: '{"test": true}' });
    expect(handler).toHaveBeenCalledWith('{"test": true}');
  });

  it('should reconnect on disconnect with exponential backoff', () => {
    const callsBefore = MockWebSocket.mock.calls.length;
    client.connect();
    mockWsInstance.onopen!();

    // Simulate disconnect
    mockWsInstance.onclose!();
    expect(client.isConnected()).toBe(false);

    // Should attempt reconnect after 1s
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.mock.calls.length - callsBefore).toBe(2); // initial + 1 reconnect
  });

  it('should disconnect cleanly', () => {
    client.connect();
    mockWsInstance.onopen!();

    client.disconnect();
    expect(mockWsInstance.close).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });
});
