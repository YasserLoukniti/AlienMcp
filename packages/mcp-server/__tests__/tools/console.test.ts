import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerConsoleTool } from '../../src/tools/console.js';

describe('alien_console tool', () => {
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
      if (name === 'alien_console') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerConsoleTool(server, mockBridge);
  });

  it('should start console capture', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({ capturing: true });

    const result = await registeredHandler({ action: 'start' });
    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('started');
  });

  it('should return captured messages', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      messages: [
        { level: 'log', text: 'Hello', timestamp: 1700000000000, source: 'console' },
        { level: 'error', text: 'Failed', timestamp: 1700000001000, source: 'console' },
      ],
    });

    const result = await registeredHandler({ action: 'getMessages' });
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain('2');
    expect(content[0].text).toContain('Hello');
    expect(content[0].text).toContain('Failed');
  });
});
