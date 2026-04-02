import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerFindElementTool } from '../../src/tools/find-element.js';

describe('alien_find_element tool', () => {
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
      if (name === 'alien_find_element') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerFindElementTool(server, mockBridge);
  });

  it('should find elements by selector', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      elements: [
        { tag: 'button', text: 'Click me', attributes: { class: 'btn' }, rect: { x: 10, y: 20, width: 100, height: 40 }, index: 0 },
        { tag: 'button', text: 'Submit', attributes: { type: 'submit' }, rect: { x: 10, y: 70, width: 100, height: 40 }, index: 1 },
      ],
    });

    const result = await registeredHandler({ selector: 'button' });
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain('2 element(s)');
    expect(content[0].text).toContain('Click me');
    expect(content[0].text).toContain('Submit');
  });

  it('should find elements by text', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      elements: [
        { tag: 'p', text: 'Welcome to our site', attributes: {}, rect: { x: 0, y: 0, width: 200, height: 20 }, index: 0 },
      ],
    });

    await registeredHandler({ text: 'Welcome' });
    expect(mockBridge.send).toHaveBeenCalledWith('findElement', { text: 'Welcome' });
  });
});
