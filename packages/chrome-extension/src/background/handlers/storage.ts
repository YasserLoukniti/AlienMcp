import { resolveTabId } from './group-utils';

export async function handleStorage(args: Record<string, unknown>): Promise<{
  data?: Record<string, unknown>;
  value?: unknown;
  success?: boolean;
  keys?: string[];
}> {
  const action = (args.action as 'getAll' | 'get' | 'set' | 'remove' | 'clear' | 'keys') || 'getAll';
  const storageType = (args.type as 'local' | 'session') || 'local';
  const key = args.key as string | undefined;
  const value = args.value;

  const tabId = await resolveTabId(args);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (act: string, sType: string, k: string | null, v: unknown) => {
      const store = sType === 'session' ? sessionStorage : localStorage;

      switch (act) {
        case 'getAll': {
          const data: Record<string, unknown> = {};
          for (let i = 0; i < store.length; i++) {
            const key = store.key(i)!;
            try {
              data[key] = JSON.parse(store.getItem(key)!);
            } catch {
              data[key] = store.getItem(key);
            }
          }
          return { data };
        }

        case 'get': {
          if (!k) return { value: null };
          const raw = store.getItem(k);
          if (raw === null) return { value: null };
          try { return { value: JSON.parse(raw) }; }
          catch { return { value: raw }; }
        }

        case 'set': {
          if (!k) return { success: false };
          store.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          return { success: true };
        }

        case 'remove': {
          if (!k) return { success: false };
          store.removeItem(k);
          return { success: true };
        }

        case 'clear': {
          store.clear();
          return { success: true };
        }

        case 'keys': {
          const keys: string[] = [];
          for (let i = 0; i < store.length; i++) {
            keys.push(store.key(i)!);
          }
          return { keys };
        }

        default:
          return { success: false };
      }
    },
    args: [action, storageType, key || null, value],
  });

  return (results[0]?.result || { success: false }) as ReturnType<typeof handleStorage> extends Promise<infer R> ? R : never;
}
