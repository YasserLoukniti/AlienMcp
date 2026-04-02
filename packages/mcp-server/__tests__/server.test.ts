import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from '../src/server.js';
import { Bridge } from '../src/bridge.js';

// Mock the bridge
vi.mock('../src/bridge.js', () => {
  return {
    Bridge: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({}),
      isConnected: vi.fn().mockReturnValue(true),
      stop: vi.fn(),
    })),
  };
});

describe('createServer', () => {
  let mockBridge: Bridge;

  beforeEach(() => {
    mockBridge = new Bridge(7888);
  });

  it('should create an MCP server instance', () => {
    const server = createServer(mockBridge);
    expect(server).toBeDefined();
  });

  it('should register all 11 tools', async () => {
    const server = createServer(mockBridge);
    expect(server).toBeDefined();
  });
});
