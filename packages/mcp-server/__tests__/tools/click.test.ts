import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerClickTool } from '../../src/tools/click.js';

describe('alien_click tool', () => {
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
      if (name === 'alien_click') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerClickTool(server, mockBridge);
  });

  it('should click by selector', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      element: { tag: 'button', text: 'Submit' },
    });

    const result = await registeredHandler({ selector: '#submit' });
    expect(mockBridge.send).toHaveBeenCalledWith('click', { selector: '#submit' });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('button');
    expect(content[0].text).toContain('Submit');
  });

  it('should click by coordinates', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({ success: true });

    const result = await registeredHandler({ x: 100, y: 200 });
    expect(mockBridge.send).toHaveBeenCalledWith('click', { x: 100, y: 200 });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('100');
    expect(content[0].text).toContain('200');
  });
});
