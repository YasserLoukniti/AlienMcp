import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
  },
});

const { handleTabs } = await import('../../src/background/handlers/tabs');

describe('handleTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all tabs', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, url: 'https://google.com', title: 'Google', active: true } as chrome.tabs.Tab,
      { id: 2, url: 'https://github.com', title: 'GitHub', active: false } as chrome.tabs.Tab,
    ]);

    const result = await handleTabs({ action: 'list' });
    expect(result.tabs).toHaveLength(2);
    expect(result.tabs![0].url).toBe('https://google.com');
    expect(result.tabs![1].active).toBe(false);
  });

  it('should create a new tab', async () => {
    vi.mocked(chrome.tabs.create).mockResolvedValue({
      id: 3,
      url: 'https://example.com',
      title: 'Example',
    } as chrome.tabs.Tab);

    const result = await handleTabs({ action: 'create', url: 'https://example.com' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com', active: true });
    expect(result.tab?.id).toBe(3);
  });

  it('should close a tab', async () => {
    vi.mocked(chrome.tabs.get).mockResolvedValue({
      id: 5,
      url: 'https://example.com',
      title: 'Example',
    } as chrome.tabs.Tab);
    vi.mocked(chrome.tabs.remove).mockResolvedValue(undefined);

    const result = await handleTabs({ action: 'close', tabId: 5 });
    expect(chrome.tabs.remove).toHaveBeenCalledWith(5);
    expect(result.tab?.id).toBe(5);
  });

  it('should activate a tab', async () => {
    vi.mocked(chrome.tabs.update).mockResolvedValue({} as chrome.tabs.Tab);
    vi.mocked(chrome.tabs.get).mockResolvedValue({
      id: 2,
      url: 'https://github.com',
      title: 'GitHub',
    } as chrome.tabs.Tab);

    const result = await handleTabs({ action: 'activate', tabId: 2 });
    expect(chrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
    expect(result.tab?.url).toBe('https://github.com');
  });

  it('should throw for close without tabId', async () => {
    await expect(handleTabs({ action: 'close' })).rejects.toThrow('tabId is required');
  });
});
