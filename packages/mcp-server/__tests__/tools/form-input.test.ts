import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerFormInputTool } from '../../src/tools/form-input.js';

describe('alien_form_input tool', () => {
  let mockBridge: Bridge;
  let registeredHandler: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    mockBridge = {
      send: vi.fn(),
      start: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      stop: vi.fn(),
    } as unknown as Bridge;

    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const originalRegister = server.registerTool.bind(server);
    server.registerTool = vi.fn().mockImplementation((name, config, handler) => {
      if (name === 'alien_form_input') registeredHandler = handler;
      return originalRegister(name, config, handler);
    });

    registerFormInputTool(server, mockBridge);
  });

  it('should fill a text input', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      field: { tag: 'input', type: 'text', name: 'email' },
    });

    const result = await registeredHandler({
      selector: '#email',
      value: 'test@example.com',
    });

    expect(mockBridge.send).toHaveBeenCalledWith('formInput', {
      selector: '#email',
      value: 'test@example.com',
    });

    const content = (result as { content: Array<{ text: string }> }).content;
    expect(content[0].text).toContain('email');
    expect(content[0].text).toContain('test@example.com');
  });

  it('should fill a select field', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      success: true,
      field: { tag: 'select', type: '', name: 'country' },
    });

    await registeredHandler({
      selector: '#country',
      value: 'FR',
      type: 'select',
    });

    expect(mockBridge.send).toHaveBeenCalledWith('formInput', {
      selector: '#country',
      value: 'FR',
      type: 'select',
    });
  });
});
