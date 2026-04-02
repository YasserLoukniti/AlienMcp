import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerNavigateTool } from '../../src/tools/navigate.js';

describe('alien_navigate tool', () => {
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
      if (name === 'alien_navigate') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerNavigateTool(server, mockBridge);
  });

  it('should call bridge with navigate command', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      url: 'https://example.com',
      title: 'Example',
    });

    const result = await registeredHandler({ url: 'https://example.com' });
    expect(mockBridge.send).toHaveBeenCalledWith('navigate', { url: 'https://example.com' });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('https://example.com');
    expect(content[0].text).toContain('Example');
  });

  it('should pass tabId and waitForLoad', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      url: 'https://test.com',
      title: 'Test',
    });

    await registeredHandler({ url: 'https://test.com', tabId: 123, waitForLoad: true });
    expect(mockBridge.send).toHaveBeenCalledWith('navigate', {
      url: 'https://test.com',
      tabId: 123,
      waitForLoad: true,
    });
  });
});
