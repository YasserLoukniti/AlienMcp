import { describe, it, expect, vi } from 'vitest';

// Mock chrome APIs before importing
vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    captureVisibleTab: vi.fn(),
    getZoom: vi.fn(),
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  scripting: {
    executeScript: vi.fn(),
  },
  debugger: {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn(),
    onEvent: { addListener: vi.fn() },
  },
  runtime: {
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    lastError: null,
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  webRequest: {
    onBeforeRequest: { addListener: vi.fn() },
    onCompleted: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
  },
});

// Import after mocking
const { CommandRouter } = await import('../src/background/command-router');

describe('CommandRouter', () => {
  it('should have all commands registered', () => {
    const router = new CommandRouter();
    const commands = router.getCommands();

    expect(commands).toContain('screenshot');
    expect(commands).toContain('navigate');
    expect(commands).toContain('click');
    expect(commands).toContain('executeJs');
    expect(commands).toContain('readPage');
    expect(commands).toContain('modifyDom');
    expect(commands).toContain('network');
    expect(commands).toContain('tabs');
    expect(commands).toContain('findElement');
    expect(commands).toContain('console');
    expect(commands).toContain('formInput');
    expect(commands).toContain('context');
    expect(commands).toContain('type');
    expect(commands.length).toBe(13);
  });

  it('should throw for unknown commands', async () => {
    const router = new CommandRouter();
    await expect(router.route('unknownCommand', {})).rejects.toThrow('Unknown command');
  });

  it('should check if command exists', () => {
    const router = new CommandRouter();
    expect(router.hasCommand('screenshot')).toBe(true);
    expect(router.hasCommand('nonexistent')).toBe(false);
  });
});
