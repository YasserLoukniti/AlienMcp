const GROUP_NAME = 'AlienMcp';

/** Get the AlienMcp tab group ID, or null if no group exists */
export async function getGroupId(): Promise<number | null> {
  const groups = await chrome.tabGroups.query({ title: GROUP_NAME });
  return groups.length > 0 ? groups[0].id : null;
}

/** Get only tabs in the AlienMcp group */
export async function getGroupTabs(): Promise<chrome.tabs.Tab[]> {
  const groupId = await getGroupId();
  if (groupId === null) return [];

  const allTabs = await chrome.tabs.query({});
  return allTabs.filter((t) => t.groupId === groupId);
}

/** Get the active tab, scoped to AlienMcp group if it exists.
 *  If group exists: returns active tab within group, or first group tab.
 *  If no group: returns the browser's active tab.
 */
export async function getActiveGroupTab(): Promise<chrome.tabs.Tab> {
  const groupTabs = await getGroupTabs();

  if (groupTabs.length > 0) {
    // Prefer the active tab if it's in the group
    const activeInGroup = groupTabs.find((t) => t.active);
    if (activeInGroup) return activeInGroup;
    // Otherwise return first tab in group
    return groupTabs[0];
  }

  // No group - fallback to browser active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) throw new Error('No active tab found');
  return activeTab;
}

/** Resolve a tabId: if provided, use it. Otherwise get active group tab. */
export async function resolveTabId(tabId?: number): Promise<number> {
  if (tabId) return tabId;
  const tab = await getActiveGroupTab();
  if (!tab.id) throw new Error('No active tab found');
  return tab.id;
}

/** Check if a tab is in the AlienMcp group */
export async function isInGroup(tabId: number): Promise<boolean> {
  const groupId = await getGroupId();
  if (groupId === null) return false;
  const tab = await chrome.tabs.get(tabId);
  return tab.groupId === groupId;
}

/** Add a tab to the AlienMcp group, creating the group if needed */
export async function addToGroup(tabId: number): Promise<number> {
  let groupId = await getGroupId();

  if (groupId === null) {
    groupId = await chrome.tabs.group({ tabIds: [tabId] });
    await chrome.tabGroups.update(groupId, {
      title: GROUP_NAME,
      color: 'green',
      collapsed: false,
    });
  } else {
    await chrome.tabs.group({ tabIds: [tabId], groupId });
  }

  return groupId;
}
