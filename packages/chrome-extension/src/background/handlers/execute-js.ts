import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handleExecuteJs(args: Record<string, unknown>): Promise<{
  result: unknown;
  error?: string;
}> {
  const code = args.code as string;
  if (!code) throw new Error('Code is required');

  const tabId = await resolveTabId(args.tabId as number | undefined);

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
