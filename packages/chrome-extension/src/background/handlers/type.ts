import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handleType(args: Record<string, unknown>): Promise<{
  success: boolean;
  typed: string;
}> {
  const text = args.text as string;
  const selector = args.selector as string | undefined;
  const delay = (args.delay as number) || 30;

  if (!text) throw new Error('Text is required');

  const tabId = await resolveTabId(args);

  if (selector) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement;
        if (!el) throw new Error(`Element not found: ${sel}`);
        el.focus();
      },
      args: [selector],
    });
  }

  await dbg.acquire(tabId);

  try {
    for (const char of text) {
      await dbg.sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char,
        key: char,
        code: `Key${char.toUpperCase()}`,
        unmodifiedText: char,
      });
      await dbg.sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: char,
        code: `Key${char.toUpperCase()}`,
      });

      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  } finally {
    await dbg.release(tabId);
  }

  return { success: true, typed: text };
}
