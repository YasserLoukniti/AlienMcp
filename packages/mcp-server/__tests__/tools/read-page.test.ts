import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerReadPageTool } from '../../src/tools/read-page.js';

describe('alien_read_page tool', () => {
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
      if (name === 'alien_read_page') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerReadPageTool(server, mockBridge);
  });

  it('should read page text content', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      content: 'Hello World page content',
      url: 'https://example.com',
      title: 'Example',
    });

    const result = await registeredHandler({ mode: 'text' });
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain('Hello World page content');
    expect(content[0].text).toContain('https://example.com');
    expect(content[0].text).toContain('Example');
  });

  it('should read HTML with selector', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      content: '<div id="main">Content</div>',
      url: 'https://example.com',
      title: 'Example',
    });

    await registeredHandler({ mode: 'html', selector: '#main' });
    expect(mockBridge.send).toHaveBeenCalledWith('readPage', {
      mode: 'html',
      selector: '#main',
    });
  });
});
