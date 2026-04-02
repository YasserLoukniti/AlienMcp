import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerNetworkTool } from '../../src/tools/network.js';

describe('alien_network tool', () => {
  let mockBridge: Bridge;
  let registeredHandler: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    mockBridge = {
      send: vi.fn(),
      connect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      disconnect: vi.fn(),
    } as unknown as Bridge;

    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const originalRegister = server.registerTool.bind(server);
    server.registerTool = vi.fn().mockImplementation((name, config, handler) => {
      if (name === 'alien_network') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerNetworkTool(server, mockBridge);
  });

  it('should start network monitoring', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({ monitoring: true });

    const result = await registeredHandler({ action: 'start' });
    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('started');
  });

  it('should return captured requests', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      requests: [
        { url: 'https://api.example.com/data', method: 'GET', status: 200, type: 'XHR', size: 1024, duration: 150 },
      ],
    });

    const result = await registeredHandler({ action: 'getRequests' });
    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('1 requests');
    expect(content[0].text).toContain('api.example.com');
  });

  it('should stop monitoring', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({ monitoring: false });

    const result = await registeredHandler({ action: 'stop' });
    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('stopped');
  });
});
