import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  type: string;
  size: number;
  duration: number;
  timestamp: number;
}

const capturedRequests = new Map<number, NetworkRequest[]>();

export async function handleNetwork(args: Record<string, unknown>): Promise<{
  requests?: NetworkRequest[];
  monitoring?: boolean;
}> {
  const action = args.action as 'start' | 'stop' | 'getRequests';
  const filter = args.filter as { urlPattern?: string; method?: string; type?: string } | undefined;

  const tabId = await resolveTabId(args);

  switch (action) {
    case 'start': {
      capturedRequests.set(tabId, []);

      await dbg.acquire(tabId);
      await dbg.enableDomain(tabId, 'Network');

      chrome.debugger.onEvent.addListener((source, method, params?) => {
        const p = (params || {}) as Record<string, unknown>;
        if (source.tabId !== tabId) return;

        if (method === 'Network.responseReceived') {
          const response = p.response as Record<string, unknown>;
          const requests = capturedRequests.get(tabId) || [];
          requests.push({
            url: response.url as string,
            method: (p.type as string) || 'GET',
            status: response.status as number,
            type: p.type as string,
            size: (response.encodedDataLength as number) || 0,
            duration: (response.timing as Record<string, number>)?.receiveHeadersEnd || 0,
            timestamp: p.timestamp as number,
          });
          capturedRequests.set(tabId, requests);
        }
      });

      return { monitoring: true };
    }

    case 'stop': {
      await dbg.release(tabId);
      return { monitoring: false };
    }

    case 'getRequests': {
      let requests = capturedRequests.get(tabId) || [];

      if (filter) {
        if (filter.urlPattern) {
          const pattern = new RegExp(filter.urlPattern);
          requests = requests.filter((r) => pattern.test(r.url));
        }
        if (filter.method) {
          requests = requests.filter((r) => r.method === filter.method);
        }
        if (filter.type) {
          requests = requests.filter((r) => r.type === filter.type);
        }
      }

      return { requests };
    }

    default:
      throw new Error(`Unknown network action: ${action}`);
  }
}
