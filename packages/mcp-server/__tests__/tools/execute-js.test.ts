import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerExecuteJsTool } from '../../src/tools/execute-js.js';

describe('alien_execute_js tool', () => {
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
      if (name === 'alien_execute_js') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerExecuteJsTool(server, mockBridge);
  });

  it('should execute JS and return result', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      result: 'Hello World',
    });

    const result = await registeredHandler({ code: 'return document.title' });
    expect(mockBridge.send).toHaveBeenCalledWith('executeJs', { code: 'return document.title' });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toBe('Hello World');
  });

  it('should return error when execution fails', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      result: undefined,
      error: 'ReferenceError: x is not defined',
    });

    const result = await registeredHandler({ code: 'return x' });
    const typedResult = result as { content: Array<{ text: string }>; isError: boolean };

    expect(typedResult.isError).toBe(true);
    expect(typedResult.content[0].text).toContain('ReferenceError');
  });

  it('should pass world parameter', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({ result: {} });

    await registeredHandler({ code: 'return window.__APP__', world: 'MAIN' });
    expect(mockBridge.send).toHaveBeenCalledWith('executeJs', {
      code: 'return window.__APP__',
      world: 'MAIN',
    });
  });

  it('should stringify non-string results', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      result: { key: 'value', count: 42 },
    });

    const result = await registeredHandler({ code: 'return {key: "value", count: 42}' });
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain('"key"');
    expect(content[0].text).toContain('42');
  });
});
