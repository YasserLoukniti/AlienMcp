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
    // Caller can pass `waitMs` to poll for the element rather than fail
    // immediately when it's not yet in the DOM (e.g. SSR → hydration race).
    // Default 0 = fail-fast, matching the historical behaviour.
    const waitMs = typeof args.waitMs === 'number' ? args.waitMs : 0;

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (sel: string, deadline: number) => {
        function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

        let el: Element | null = null;
        const stop = Date.now() + deadline;
        do {
          el = document.querySelector(sel);
          if (el) break;
          if (deadline === 0) break;
          await sleep(100);
        } while (Date.now() < stop);

        if (!el) return { success: false, element: null };

        // Helper: dispatch a realistic mouse sequence in addition to the
        // native .click(). React handlers may listen to mouseup or
        // pointer events (Framer Motion, Radix, React Aria) rather than
        // the bare click event.
        const fire = (target: Element) => {
          try { (target as HTMLElement).click(); } catch (_e) { /* noop */ }
          try {
            const rect = target.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const mk = (type: string) => new MouseEvent(type, {
              bubbles: true, cancelable: true, view: window, button: 0,
              clientX: cx, clientY: cy,
            });
            target.dispatchEvent(mk('pointerdown'));
            target.dispatchEvent(mk('mousedown'));
            target.dispatchEvent(mk('pointerup'));
            target.dispatchEvent(mk('mouseup'));
            target.dispatchEvent(mk('click'));
          } catch (_e) { /* noop */ }
        };

        const isToggle = el.tagName === 'INPUT'
          && ((el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio');

        // For checkboxes / radios, capture the prior `checked` state so we
        // can detect when the click was swallowed (visually-hidden inputs
        // wrapped in a styled label, common pattern in Lever/Greenhouse/
        // custom React libs). When the state didn't flip, retry on the
        // wrapping <label> — clicking the label is what the browser does
        // for a real user click on the styled box.
        const wasChecked = isToggle ? (el as HTMLInputElement).checked : null;

        fire(el);

        if (isToggle) {
          // Give React a tick to commit the state change.
          await sleep(50);
          const stillSame = (el as HTMLInputElement).checked === wasChecked;
          if (stillSame) {
            const wrapLabel = el.closest('label')
              ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
            if (wrapLabel) {
              fire(wrapLabel);
              await sleep(50);
            }
          }
        }

        return {
          success: true,
          element: {
            tag: el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.slice(0, 200) || '',
          },
        };
      },
      args: [selector, waitMs],
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
