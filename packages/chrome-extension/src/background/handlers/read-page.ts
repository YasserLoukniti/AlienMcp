import { resolveTabId } from './group-utils';

export async function handleReadPage(args: Record<string, unknown>): Promise<{
  content: string;
  url: string;
  title: string;
}> {
  const mode = (args.mode as 'html' | 'text' | 'selection') || 'text';
  const selector = args.selector as string | undefined;

  const tabId = await resolveTabId(args.tabId as number | undefined);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (m: string, sel: string | null) => {
      let content: string;

      if (sel) {
        const el = document.querySelector(sel);
        if (!el) return { content: '', url: location.href, title: document.title, error: `Element not found: ${sel}` };
        content = m === 'html' ? el.outerHTML : (el as HTMLElement).innerText;
      } else if (m === 'html') {
        content = document.documentElement.outerHTML;
      } else if (m === 'selection') {
        content = window.getSelection()?.toString() || '';
      } else {
        content = document.body.innerText;
      }

      return {
        content,
        url: location.href,
        title: document.title,
      };
    },
    args: [mode, selector || null],
  });

  const result = results[0]?.result as { content: string; url: string; title: string } | undefined;
  if (!result) throw new Error('Failed to read page');

  return result;
}
