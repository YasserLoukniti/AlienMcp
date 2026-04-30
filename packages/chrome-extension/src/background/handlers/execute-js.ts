import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

/**
 * Execute arbitrary JS in the page and return its value.
 *
 * Sites with strict CSP (no `unsafe-eval`) make dynamic JS evaluation hard:
 *   - chrome.scripting in MAIN world inherits the page's CSP, so `eval` /
 *     `new Function` throw "Refused to evaluate a string as JavaScript".
 *   - chrome.scripting in ISOLATED world doesn't inherit the page CSP but
 *     inherits OUR extension's CSP (`script-src 'self'`), which also bans
 *     dynamic evaluation under MV3.
 *   - chrome.debugger.Runtime.evaluate works around CSP (it's the same
 *     code path DevTools uses), but Chrome refuses to attach when DevTools
 *     is already attached or when the tab's process is shared with another
 *     extension — surfacing as "Cannot access a chrome-extension:// URL of
 *     different extension".
 *
 * For workflows that need code-string evaluation we still try the debugger
 * path here. Most callers should prefer the typed handlers (alien_click,
 * alien_form_input, alien_find_element, alien_wait) which use chrome.scripting
 * with PRECOMPILED `func` arguments — those bypass CSP entirely because the
 * function body is part of the extension's bundle and only the args are
 * passed at call time.
 */
export async function handleExecuteJs(args: Record<string, unknown>): Promise<{
  result: unknown;
  error?: string;
}> {
  const code = args.code as string;
  if (!code) throw new Error('Code is required');

  const tabId = await resolveTabId(args);

  await dbg.acquire(tabId);

  try {
    const response = await dbg.sendCommand(tabId, 'Runtime.evaluate', {
      expression: code,
      returnByValue: true,
      awaitPromise: true,
    }) as { result: { value?: unknown; description?: string; type: string; subtype?: string }; exceptionDetails?: { text: string; exception?: { description?: string } } };

    if (response.exceptionDetails) {
      const errMsg = response.exceptionDetails.exception?.description || response.exceptionDetails.text;
      return { result: undefined, error: errMsg };
    }

    return { result: response.result.value ?? response.result.description };
  } finally {
    await dbg.release(tabId);
  }
}
