import { getGroupTabs, addToGroup, getGroupId } from './group-utils';

export async function handleTabs(args: Record<string, unknown>): Promise<{
  tabs?: Array<{ id: number; url: string; title: string; active: boolean; inGroup: boolean }>;
  tab?: { id: number; url: string; title: string };
}> {
  const action = args.action as 'list' | 'create' | 'close' | 'activate';

  switch (action) {
    case 'list': {
      const groupTabs = await getGroupTabs();
      const groupId = await getGroupId();

      if (groupTabs.length > 0) {
        // Only show group tabs
        return {
          tabs: groupTabs.map((t) => ({
            id: t.id!,
            url: t.url || '',
            title: t.title || '',
            active: t.active || false,
            inGroup: true,
          })),
        };
      }

      // No group yet - show all tabs
      const allTabs = await chrome.tabs.query({});
      return {
        tabs: allTabs.map((t) => ({
          id: t.id!,
          url: t.url || '',
          title: t.title || '',
          active: t.active || false,
          inGroup: t.groupId === groupId,
        })),
      };
    }

    case 'create': {
      const url = args.url as string | undefined;
      const tab = await chrome.tabs.create({ url, active: true });

      // Auto-add new tabs to the group
      if (tab.id) {
        await addToGroup(tab.id);
      }

      return {
        tab: {
          id: tab.id!,
          url: tab.url || url || '',
          title: tab.title || '',
        },
      };
    }

    case 'close': {
      const tabId = args.tabId as number;
      if (!tabId) throw new Error('tabId is required for close action');
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.remove(tabId);
      return {
        tab: {
          id: tabId,
          url: tab.url || '',
          title: tab.title || '',
        },
      };
    }

    case 'activate': {
      const tabId = args.tabId as number;
      if (!tabId) throw new Error('tabId is required for activate action');
      await chrome.tabs.update(tabId, { active: true });
      const tab = await chrome.tabs.get(tabId);
      return {
        tab: {
          id: tabId,
          url: tab.url || '',
          title: tab.title || '',
        },
      };
    }

    default:
      throw new Error(`Unknown tab action: ${action}`);
  }
}
