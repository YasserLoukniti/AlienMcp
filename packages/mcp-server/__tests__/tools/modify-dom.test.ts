import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerModifyDomTool } from '../../src/tools/modify-dom.js';

describe('alien_modify_dom tool', () => {
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
      if (name === 'alien_modify_dom') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerModifyDomTool(server, mockBridge);
  });

  it('should modify DOM elements', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      matchedElements: 3,
    });

    const result = await registeredHandler({
      selector: '.item',
      action: 'setStyle',
      value: 'color: red',
    });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('3 element(s)');
    expect(content[0].text).toContain('setStyle');
  });

  it('should pass setAttribute params', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      matchedElements: 1,
    });

    await registeredHandler({
      selector: '#main',
      action: 'setAttribute',
      attribute: 'data-test',
      value: 'hello',
    });

    expect(mockBridge.send).toHaveBeenCalledWith('modifyDom', {
      selector: '#main',
      action: 'setAttribute',
      attribute: 'data-test',
      value: 'hello',
    });
  });
});
