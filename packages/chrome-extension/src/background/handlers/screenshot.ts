import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handleScreenshot(args: Record<string, unknown>): Promise<{
  image: string;
  width: number;
  height: number;
  url: string;
  title: string;
}> {
  const tabId = await resolveTabId(args);
  const format = (args.format as 'png' | 'jpeg') || 'png';
  const quality = (args.quality as number) || 100;
  const fullPage = args.fullPage as boolean;

  if (fullPage) {
    await dbg.acquire(tabId);

    try {
      const { contentSize } = await dbg.sendCommand(
        tabId,
        'Page.getLayoutMetrics',
      ) as { contentSize: { width: number; height: number } };

      await dbg.sendCommand(tabId, 'Emulation.setDeviceMetricsOverride', {
        width: Math.ceil(contentSize.width),
        height: Math.ceil(contentSize.height),
        deviceScaleFactor: 1,
        mobile: false,
      });

      const { data } = await dbg.sendCommand(
        tabId,
        'Page.captureScreenshot',
        { format, quality, fromSurface: true },
      ) as { data: string };

      await dbg.sendCommand(tabId, 'Emulation.clearDeviceMetricsOverride');

      const tabInfo = await chrome.tabs.get(tabId);
      return {
        image: data,
        width: Math.ceil(contentSize.width),
        height: Math.ceil(contentSize.height),
        url: tabInfo.url || '',
        title: tabInfo.title || '',
      };
    } finally {
      await dbg.release(tabId);
    }
  }

  // Viewport screenshot
  const dataUrl = await chrome.tabs.captureVisibleTab(null as unknown as number, {
    format,
    quality,
  });

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const tab = await chrome.tabs.get(tabId);
  const zoom = await chrome.tabs.getZoom(tabId);

  return {
    image: base64,
    width: Math.round((tab.width || 1920) * zoom),
    height: Math.round((tab.height || 1080) * zoom),
    url: tab.url || '',
    title: tab.title || '',
  };
}
