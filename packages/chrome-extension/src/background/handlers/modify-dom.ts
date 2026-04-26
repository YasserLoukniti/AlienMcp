import { resolveTabId } from './group-utils';

export async function handleModifyDom(args: Record<string, unknown>): Promise<{
  success: boolean;
  matchedElements: number;
}> {
  const selector = args.selector as string;
  const action = args.action as string;
  const attribute = args.attribute as string | undefined;
  const value = args.value as string | undefined;

  if (!selector) throw new Error('Selector is required');
  if (!action) throw new Error('Action is required');

  const tabId = await resolveTabId(args);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (sel: string, act: string, attr: string | null, val: string | null) => {
      const elements = document.querySelectorAll(sel);
      elements.forEach((el) => {
        switch (act) {
          case 'setAttribute':
            if (attr && val !== null) el.setAttribute(attr, val!);
            break;
          case 'removeAttribute':
            if (attr) el.removeAttribute(attr);
            break;
          case 'setInnerHTML':
            el.innerHTML = val || '';
            break;
          case 'setTextContent':
            el.textContent = val || '';
            break;
          case 'setStyle':
            (el as HTMLElement).style.cssText = val || '';
            break;
          case 'remove':
            el.remove();
            break;
        }
      });
      return { success: true, matchedElements: elements.length };
    },
    args: [selector, action, attribute || null, value || null],
  });

  const result = results[0]?.result as { success: boolean; matchedElements: number } | undefined;
  return result || { success: false, matchedElements: 0 };
}
