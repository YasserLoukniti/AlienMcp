import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

interface ConsoleMessage {
  level: string;
  text: string;
  timestamp: number;
  source: string;
}

const capturedMessages = new Map<number, ConsoleMessage[]>();

export async function handleConsole(args: Record<string, unknown>): Promise<{
  messages?: ConsoleMessage[];
  capturing?: boolean;
}> {
  const action = args.action as 'start' | 'stop' | 'getMessages';
  const level = (args.level as string) || 'all';

  const tabId = await resolveTabId(args.tabId as number | undefined);

  switch (action) {
    case 'start': {
      capturedMessages.set(tabId, []);

      await dbg.acquire(tabId);
      await dbg.enableDomain(tabId, 'Runtime');

      chrome.debugger.onEvent.addListener((source, method, params?) => {
        const p = (params || {}) as Record<string, unknown>;
        if (source.tabId !== tabId) return;

        if (method === 'Runtime.consoleAPICalled') {
          const msgArgs = p.args as Array<{ value?: string; description?: string }>;
          const text = msgArgs.map((a) => a.value || a.description || '').join(' ');
          const messages = capturedMessages.get(tabId) || [];
          messages.push({
            level: p.type as string,
            text,
            timestamp: (p.timestamp as number) || Date.now(),
            source: 'console',
          });
          capturedMessages.set(tabId, messages);
        }

        if (method === 'Runtime.exceptionThrown') {
          const detail = p.exceptionDetails as Record<string, unknown>;
          const messages = capturedMessages.get(tabId) || [];
          messages.push({
            level: 'error',
            text: (detail.text as string) || 'Unknown exception',
            timestamp: Date.now(),
            source: 'exception',
          });
          capturedMessages.set(tabId, messages);
        }
      });

      return { capturing: true };
    }

    case 'stop': {
      await dbg.release(tabId);
      return { capturing: false };
    }

    case 'getMessages': {
      let messages = capturedMessages.get(tabId) || [];
      if (level !== 'all') {
        messages = messages.filter((m) => m.level === level);
      }
      return { messages };
    }

    default:
      throw new Error(`Unknown console action: ${action}`);
  }
}
