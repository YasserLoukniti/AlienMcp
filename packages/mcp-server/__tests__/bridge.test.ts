import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { Bridge } from '../src/bridge.js';

describe('Bridge (WebSocket Server)', () => {
  let bridge: Bridge;
  const PORT = 17889;

  beforeEach(async () => {
    bridge = new Bridge(PORT);
    await bridge.start();
  });

  afterEach(async () => {
    bridge.stop();
    // Small delay to let port free up
    await new Promise((r) => setTimeout(r, 100));
  });

  function connectClient(): Promise<WebSocket> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`);
      ws.on('open', () => resolve(ws));
    });
  }

  it('should start WebSocket server and accept connections', async () => {
    const client = await connectClient();
    // Wait a tick for the bridge to register the connection
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.isConnected()).toBe(true);
    client.close();
  });

  it('should send command and receive response', async () => {
    const client = await connectClient();

    // Echo back any command
    client.on('message', (data) => {
      const request = JSON.parse(data.toString());
      client.send(JSON.stringify({
        id: request.id,
        data: { success: true, value: 42 },
        error: null,
      }));
    });

    await new Promise((r) => setTimeout(r, 50));
    const result = await bridge.send('testCommand', { key: 'value' });
    expect(result).toEqual({ success: true, value: 42 });
    client.close();
  });

  it('should handle error responses', async () => {
    const client = await connectClient();

    client.on('message', (data) => {
      const request = JSON.parse(data.toString());
      client.send(JSON.stringify({
        id: request.id,
        data: null,
        error: 'Something went wrong',
      }));
    });

    await new Promise((r) => setTimeout(r, 50));
    await expect(bridge.send('failCommand', {})).rejects.toThrow('Something went wrong');
    client.close();
  });

  it('should timeout if no response received', async () => {
    const shortBridge = new Bridge(PORT + 1, 500);
    await shortBridge.start();

    const client = await new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${PORT + 1}`);
      ws.on('open', () => resolve(ws));
    });

    await new Promise((r) => setTimeout(r, 50));
    await expect(shortBridge.send('slowCommand', {})).rejects.toThrow('timed out');

    client.close();
    shortBridge.stop();
    await new Promise((r) => setTimeout(r, 100));
  });

  it('should reject pending requests on client disconnect', async () => {
    const client = await connectClient();
    await new Promise((r) => setTimeout(r, 50));

    const sendPromise = bridge.send('testCommand', {});
    client.close();

    await expect(sendPromise).rejects.toThrow();
  });

  it('should throw when sending without connected client', async () => {
    // No client connected
    await expect(bridge.send('testCommand', {})).rejects.toThrow('Chrome extension not connected');
  });

  it('should handle multiple concurrent commands', async () => {
    const client = await connectClient();

    client.on('message', (data) => {
      const request = JSON.parse(data.toString());
      setTimeout(() => {
        client.send(JSON.stringify({
          id: request.id,
          data: { command: request.command, echo: request.args },
          error: null,
        }));
      }, Math.random() * 50);
    });

    await new Promise((r) => setTimeout(r, 50));

    const [r1, r2, r3] = await Promise.all([
      bridge.send('cmd1', { n: 1 }),
      bridge.send('cmd2', { n: 2 }),
      bridge.send('cmd3', { n: 3 }),
    ]);

    expect((r1 as { command: string }).command).toBe('cmd1');
    expect((r2 as { command: string }).command).toBe('cmd2');
    expect((r3 as { command: string }).command).toBe('cmd3');
    client.close();
  });

  it('should ignore ping messages', async () => {
    const client = await connectClient();
    await new Promise((r) => setTimeout(r, 50));

    // Send a ping - should not throw or affect pending requests
    client.send(JSON.stringify({ type: 'ping' }));
    await new Promise((r) => setTimeout(r, 50));

    expect(bridge.isConnected()).toBe(true);
    client.close();
  });
});
