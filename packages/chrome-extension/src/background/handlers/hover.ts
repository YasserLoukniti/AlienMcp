import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handleHover(args: Record<string, unknown>): Promise<{
  success: boolean;
  element?: { tag: string; text: string; rect: { x: number; y: number; width: number; height: number } };
}> {
  const tabId = await resolveTabId(args.tabId as number | undefined);
  const selector = args.selector as string | undefined;
  const x = args.x as number | undefined;
  const y = args.y as number | undefined;

  if (selector) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el as HTMLElement).innerText?.slice(0, 200) || '',
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          centerX: Math.round(rect.x + rect.width / 2),
          centerY: Math.round(rect.y + rect.height / 2),
        };
      },
      args: [selector],
    });

    const info = results[0]?.result as { tag: string; text: string; rect: { x: number; y: number; width: number; height: number }; centerX: number; centerY: number } | null;
    if (!info) throw new Error(`Element not found: ${selector}`);

    await dbg.acquire(tabId);
    try {
      await dbg.sendCommand(tabId, 'Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: info.centerX,
        y: info.centerY,
      });
    } finally {
      await dbg.release(tabId);
    }

    return { success: true, element: { tag: info.tag, text: info.text, rect: info.rect } };
  }

  if (x !== undefined && y !== undefined) {
    await dbg.acquire(tabId);
    try {
      await dbg.sendCommand(tabId, 'Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y,
      });
    } finally {
      await dbg.release(tabId);
    }

    return { success: true };
  }

  throw new Error('Either selector or coordinates (x, y) required');
}
