import { resolveTabId } from './group-utils';

export async function handleScroll(args: Record<string, unknown>): Promise<{
  success: boolean;
  scrollX: number;
  scrollY: number;
  pageHeight: number;
}> {
  const tabId = await resolveTabId(args.tabId as number | undefined);
  const direction = (args.direction as 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom') || 'down';
  const amount = (args.amount as number) || 500;
  const selector = args.selector as string | undefined;

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (dir: string, amt: number, sel: string | null) => {
      if (sel) {
        const el = document.querySelector(sel);
        if (!el) return { success: false, scrollX: 0, scrollY: 0, pageHeight: 0 };
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        return {
          success: true,
          scrollX: Math.round(window.scrollX),
          scrollY: Math.round(window.scrollY),
          pageHeight: document.body.scrollHeight,
        };
      }

      switch (dir) {
        case 'up':
          window.scrollBy({ top: -amt, behavior: 'instant' });
          break;
        case 'down':
          window.scrollBy({ top: amt, behavior: 'instant' });
          break;
        case 'left':
          window.scrollBy({ left: -amt, behavior: 'instant' });
          break;
        case 'right':
          window.scrollBy({ left: amt, behavior: 'instant' });
          break;
        case 'top':
          window.scrollTo({ top: 0, behavior: 'instant' });
          break;
        case 'bottom':
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
          break;
      }

      return {
        success: true,
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY),
        pageHeight: document.body.scrollHeight,
      };
    },
    args: [direction, amount, selector || null],
  });

  const result = results[0]?.result as { success: boolean; scrollX: number; scrollY: number; pageHeight: number } | undefined;
  return result || { success: false, scrollX: 0, scrollY: 0, pageHeight: 0 };
}
