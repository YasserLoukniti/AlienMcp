import { getGroupTabs, getActiveGroupTab, getGroupId } from './group-utils';

export async function handleContext(): Promise<{
  activeTab: { id: number; url: string; title: string; favIconUrl: string };
  groupTabs: Array<{ id: number; url: string; title: string; active: boolean }>;
  tabCount: number;
  hasGroup: boolean;
}> {
  const activeTab = await getActiveGroupTab();
  const groupTabs = await getGroupTabs();
  const groupId = await getGroupId();

  return {
    activeTab: {
      id: activeTab.id!,
      url: activeTab.url || '',
      title: activeTab.title || '',
      favIconUrl: activeTab.favIconUrl || '',
    },
    groupTabs: groupTabs.map((t) => ({
      id: t.id!,
      url: t.url || '',
      title: t.title || '',
      active: t.active || false,
    })),
    tabCount: groupTabs.length,
    hasGroup: groupId !== null,
  };
}
