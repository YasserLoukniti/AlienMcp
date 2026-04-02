import { resolveTabId } from './group-utils';

export async function handleCookies(args: Record<string, unknown>): Promise<{
  cookies?: Array<{ name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean; expires: number }>;
  cookie?: { name: string; value: string };
  deleted?: boolean;
}> {
  const action = (args.action as 'get' | 'getAll' | 'set' | 'delete') || 'getAll';

  const tabId = await resolveTabId(args.tabId as number | undefined);
  const tab = await chrome.tabs.get(tabId);
  const url = (args.url as string) || tab.url || '';

  switch (action) {
    case 'getAll': {
      const cookies = await chrome.cookies.getAll({ url });
      return {
        cookies: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          expires: c.expirationDate || 0,
        })),
      };
    }

    case 'get': {
      const name = args.name as string;
      if (!name) throw new Error('Cookie name is required');
      const cookie = await chrome.cookies.get({ url, name });
      if (!cookie) throw new Error(`Cookie "${name}" not found`);
      return { cookie: { name: cookie.name, value: cookie.value } };
    }

    case 'set': {
      const name = args.name as string;
      const value = args.value as string;
      if (!name) throw new Error('Cookie name is required');
      if (value === undefined) throw new Error('Cookie value is required');

      const domain = new URL(url).hostname;
      await chrome.cookies.set({
        url,
        name,
        value,
        domain,
        path: (args.path as string) || '/',
        secure: (args.secure as boolean) ?? url.startsWith('https'),
        httpOnly: (args.httpOnly as boolean) ?? false,
      });
      return { cookie: { name, value } };
    }

    case 'delete': {
      const name = args.name as string;
      if (!name) throw new Error('Cookie name is required');
      await chrome.cookies.remove({ url, name });
      return { deleted: true };
    }

    default:
      throw new Error(`Unknown cookie action: ${action}`);
  }
}
