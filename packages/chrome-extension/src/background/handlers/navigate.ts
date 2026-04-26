import { resolveTabId } from './group-utils';

export async function handleNavigate(args: Record<string, unknown>): Promise<{
  success: boolean;
  url: string;
  title: string;
}> {
  const url = args.url as string;
  if (!url) throw new Error('URL is required');

  const waitForLoad = args.waitForLoad !== false;

  const tabId = await resolveTabId(args);
  await chrome.tabs.update(tabId, { url });

  if (waitForLoad) {
    await new Promise<void>((resolve) => {
      function listener(updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);

      // Timeout after 30s
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, 30000);
    });
  }

  const tab = await chrome.tabs.get(tabId);

  return {
    success: true,
    url: tab.url || url,
    title: tab.title || '',
  };
}
