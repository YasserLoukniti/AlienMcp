import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handleClick(args: Record<string, unknown>): Promise<{
  success: boolean;
  element?: { tag: string; text: string };
}> {
  const selector = args.selector as string | undefined;
  const x = args.x as number | undefined;
  const y = args.y as number | undefined;

  const tabId = await resolveTabId(args);

  if (selector) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return { success: false, element: null };
        (el as HTMLElement).click();
        return {
          success: true,
          element: {
            tag: el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.slice(0, 200) || '',
          },
        };
      },
      args: [selector],
    });

    const result = results[0]?.result as { success: boolean; element: { tag: string; text: string } | null } | undefined;
    if (!result?.success) throw new Error(`Element not found: ${selector}`);

    return { success: true, element: result.element || undefined };
  }

  if (x !== undefined && y !== undefined) {
    const button = (args.button as string) || 'left';
    await dbg.acquire(tabId);

    try {
      await dbg.sendCommand(tabId, 'Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x, y,
        button,
        clickCount: 1,
      });
      await dbg.sendCommand(tabId, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x, y,
        button,
        clickCount: 1,
      });
    } finally {
      await dbg.release(tabId);
    }

    return { success: true };
  }

  throw new Error('Either selector or coordinates (x, y) are required');
}
