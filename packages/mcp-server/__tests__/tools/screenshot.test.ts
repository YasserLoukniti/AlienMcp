import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../../src/bridge.js';
import { registerScreenshotTool } from '../../src/tools/screenshot.js';

vi.mock('../../src/bridge.js');

describe('alien_screenshot tool', () => {
  let server: McpServer;
  let mockBridge: Bridge;
  let registeredHandler: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    mockBridge = {
      send: vi.fn(),
      connect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      disconnect: vi.fn(),
    } as unknown as Bridge;

    // Capture the registered handler
    server = new McpServer({ name: 'test', version: '1.0.0' });
    const originalRegister = server.registerTool.bind(server);
    server.registerTool = vi.fn().mockImplementation((name, config, handler) => {
      if (name === 'alien_screenshot') {
        registeredHandler = handler;
      }
      return originalRegister(name, config, handler);
    });

    registerScreenshotTool(server, mockBridge);
  });

  it('should register the tool', () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      'alien_screenshot',
      expect.objectContaining({ description: expect.any(String) }),
      expect.any(Function),
    );
  });

  it('should call bridge with screenshot command', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      image: 'base64data',
      width: 1920,
      height: 1080,
    });

    const result = await registeredHandler({ format: 'png' });

    expect(mockBridge.send).toHaveBeenCalledWith('screenshot', { format: 'png' });
    expect(result).toHaveProperty('content');
    expect((result as { content: Array<{ type: string }> }).content[0].type).toBe('image');
  });

  it('should handle jpeg format', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      image: 'jpegbase64',
      width: 800,
      height: 600,
    });

    const result = await registeredHandler({ format: 'jpeg', quality: 80 });
    const content = (result as { content: Array<{ type: string; mimeType?: string }> }).content;

    expect(content[0].mimeType).toBe('image/jpeg');
  });

  it('should include dimensions in text response', async () => {
    vi.mocked(mockBridge.send).mockResolvedValue({
      image: 'data',
      width: 1920,
      height: 1080,
    });

    const result = await registeredHandler({});
    const content = (result as { content: Array<{ type: string; text?: string }> }).content;
    const textItem = content.find((c) => c.type === 'text');

    expect(textItem?.text).toContain('1920x1080');
  });
});
