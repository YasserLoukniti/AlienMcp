import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerTabsTool } from '../../src/tools/tabs.js';

describe('alien_tabs tool', () => {
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
      if (name === 'alien_tabs') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerTabsTool(server, mockBridge);
  });

  it('should list tabs', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      tabs: [
        { id: 1, url: 'https://google.com', title: 'Google', active: true },
        { id: 2, url: 'https://github.com', title: 'GitHub', active: false },
      ],
    });

    const result = await registeredHandler({ action: 'list' });
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain('Google');
    expect(content[0].text).toContain('GitHub');
    expect(content[0].text).toContain('>'); // Active indicator
  });

  it('should create a new tab', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      tab: { id: 3, url: 'https://example.com', title: 'Example' },
    });

    const result = await registeredHandler({ action: 'create', url: 'https://example.com' });
    expect(mockBridge.send).toHaveBeenCalledWith('tabs', {
      action: 'create',
      url: 'https://example.com',
    });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('created');
  });

  it('should close a tab', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      tab: { id: 5, url: 'https://example.com', title: 'Example' },
    });

    await registeredHandler({ action: 'close', tabId: 5 });
    expect(mockBridge.send).toHaveBeenCalledWith('tabs', { action: 'close', tabId: 5 });
  });
});
