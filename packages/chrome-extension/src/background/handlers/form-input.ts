import { resolveTabId } from './group-utils';

export async function handleFormInput(args: Record<string, unknown>): Promise<{
  success: boolean;
  field?: { tag: string; type: string; name: string };
}> {
  const selector = args.selector as string;
  const value = args.value as string;
  const clear = args.clear !== false;

  if (!selector) throw new Error('Selector is required');
  if (value === undefined) throw new Error('Value is required');

  const tabId = await resolveTabId(args.tabId as number | undefined);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (sel: string, val: string, clr: boolean) => {
      const el = document.querySelector(sel);
      if (!el) return { success: false, error: `Element not found: ${sel}` };

      const tag = el.tagName.toLowerCase();
      const inputType = (el as HTMLInputElement).type || '';
      const name = (el as HTMLInputElement).name || '';

      if (tag === 'select') {
        (el as HTMLSelectElement).value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (inputType === 'checkbox' || inputType === 'radio') {
        const shouldCheck = val === 'true' || val === '1' || val === 'on';
        (el as HTMLInputElement).checked = shouldCheck;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Text input, textarea, etc.
        // Use native setter to work with React/Vue/Angular
        const nativeSetter = Object.getOwnPropertyDescriptor(
          tag === 'textarea'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeSetter) {
          if (clr) {
            nativeSetter.call(el, '');
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          nativeSetter.call(el, val);
        } else {
          (el as HTMLInputElement).value = val;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return {
        success: true,
        field: { tag, type: inputType, name },
      };
    },
    args: [selector, value, clear],
  });

  const result = results[0]?.result as { success: boolean; error?: string; field?: { tag: string; type: string; name: string } } | undefined;
  if (!result?.success) throw new Error(result?.error || 'Failed to fill form field');

  return { success: true, field: result.field };
}
