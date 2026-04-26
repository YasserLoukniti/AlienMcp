import { resolveTabId } from './group-utils';

export async function handleWait(args: Record<string, unknown>): Promise<{
  found: boolean;
  elapsed: number;
  element?: { tag: string; text: string };
}> {
  const tabId = await resolveTabId(args);
  const selector = args.selector as string | undefined;
  const text = args.text as string | undefined;
  const timeout = (args.timeout as number) || 10000;
  const interval = 200;

  if (!selector && !text) throw new Error('Either selector or text is required');

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string | null, txt: string | null) => {
        let el: Element | null = null;

        if (sel) {
          el = document.querySelector(sel);
        } else if (txt) {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) =>
              node.textContent?.includes(txt!) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
          });
          if (walker.nextNode()) {
            el = walker.currentNode.parentElement;
          }
        }

        if (!el) return null;

        return {
          tag: el.tagName.toLowerCase(),
          text: (el as HTMLElement).innerText?.slice(0, 200) || '',
        };
      },
      args: [selector || null, text || null],
    });

    const result = results[0]?.result as { tag: string; text: string } | null;
    if (result) {
      return {
        found: true,
        elapsed: Date.now() - startTime,
        element: result,
      };
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  return { found: false, elapsed: Date.now() - startTime };
}
