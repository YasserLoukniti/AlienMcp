import * as sessionState from '../session-state';

type Args = Record<string, unknown>;

function getSession(args: Args): sessionState.SessionInfo | null {
  const sessionId = args.__sessionId as string | undefined;
  if (!sessionId) return null;
  return sessionState.getBySessionId(sessionId) ?? null;
}

function getTargetTitle(args: Args): string {
  const session = getSession(args);
  if (!session) return sessionState.LEGACY_GROUP_NAME;
  return sessionState.getGroupName(session.label);
}

/** Get this session's tab group ID, or null if no group exists yet. */
export async function getGroupId(args: Args = {}): Promise<number | null> {
  const session = getSession(args);
  if (session?.groupId !== undefined) {
    try {
      await chrome.tabGroups.get(session.groupId);
      return session.groupId;
    } catch {
      session.groupId = undefined;
    }
  }

  const title = getTargetTitle(args);
  const groups = await chrome.tabGroups.query({ title });
  if (groups.length === 0) return null;
  const groupId = groups[0].id;
  if (session) session.groupId = groupId;
  return groupId;
}

/** Get only tabs in this session's group */
export async function getGroupTabs(args: Args = {}): Promise<chrome.tabs.Tab[]> {
  const groupId = await getGroupId(args);
  if (groupId === null) return [];

  const allTabs = await chrome.tabs.query({});
  return allTabs.filter((t) => t.groupId === groupId);
}

/** Get the active tab, scoped to this session's group if it exists. */
export async function getActiveGroupTab(args: Args = {}): Promise<chrome.tabs.Tab> {
  const groupTabs = await getGroupTabs(args);

  if (groupTabs.length > 0) {
    const activeInGroup = groupTabs.find((t) => t.active);
    if (activeInGroup) return activeInGroup;
    return groupTabs[0];
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) throw new Error('No active tab found');
  return activeTab;
}

/** Resolve a tabId: if provided in args, use it. Otherwise fall back to active group tab. */
export async function resolveTabId(args: Args = {}): Promise<number> {
  const tabId = args.tabId as number | undefined;
  if (tabId) return tabId;
  const tab = await getActiveGroupTab(args);
  if (!tab.id) throw new Error('No active tab found');
  return tab.id;
}

/** Check if a tab is in this session's group */
export async function isInGroup(tabId: number, args: Args = {}): Promise<boolean> {
  const groupId = await getGroupId(args);
  if (groupId === null) return false;
  const tab = await chrome.tabs.get(tabId);
  return tab.groupId === groupId;
}

/** Add a tab to this session's group, creating the group if needed */
export async function addToGroup(tabId: number, args: Args = {}): Promise<number> {
  const session = getSession(args);
  const title = getTargetTitle(args);
  let groupId = await getGroupId(args);

  if (groupId === null) {
    groupId = await chrome.tabs.group({ tabIds: [tabId] });
    await chrome.tabGroups.update(groupId, {
      title,
      color: pickColorFor(session?.sessionId ?? title),
      collapsed: false,
    });
    if (session) sessionState.setGroupId(session.sessionId, groupId);
  } else {
    await chrome.tabs.group({ tabIds: [tabId], groupId });
  }

  return groupId;
}

/** Rename an existing group when the session label changes. */
export async function renameGroup(info: sessionState.SessionInfo): Promise<void> {
  const newTitle = sessionState.getGroupName(info.label);

  if (info.groupId !== undefined) {
    try {
      await chrome.tabGroups.update(info.groupId, { title: newTitle });
      return;
    } catch {
      info.groupId = undefined;
    }
  }

  const groups = await chrome.tabGroups.query({});
  const match = groups.find((g) => g.title === newTitle);
  if (match) {
    info.groupId = match.id;
  }
}

const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange',
];

function pickColorFor(key: string): chrome.tabGroups.ColorEnum {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % GROUP_COLORS.length;
  return GROUP_COLORS[idx];
}
