/**
 * AlienMcp popup.
 *
 * One job: show the boundary and let the user move it. Tabs inside the
 * AlienMcp tab group are reachable by the local MCP client; everything else is
 * not. The two lists are rendered separately so that boundary is visible
 * rather than described.
 *
 * Rows are built as DOM nodes, never through innerHTML: the extension CSP
 * (script-src 'self') blocks inline handlers, so an onerror="" attribute
 * injected through innerHTML silently never fires.
 */

const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;
const notice = document.getElementById('notice')!;
const noticeText = document.getElementById('notice-text')!;
const reconnectBtn = document.getElementById('reconnect-btn')!;
const sharedList = document.getElementById('shared-list')!;
const restList = document.getElementById('rest-list')!;
const restSection = document.querySelector('.rest') as HTMLElement;
const addTabBtn = document.getElementById('add-tab-btn')!;
const groupCount = document.getElementById('group-count')!;
const restCount = document.getElementById('rest-count')!;
const version = document.getElementById('version')!;

const GROUP_NAME = 'AlienMcp';
const GROUP_COLOR: chrome.tabGroups.ColorEnum = 'green';

let alienGroupId: number | null = null;

version.textContent = `v${chrome.runtime.getManifest().version}`;

function updateStatus(connected: boolean, sessionCount = 0, ports: number[] = []): void {
  statusDot.className = `beacon ${connected ? 'connected' : 'disconnected'}`;

  if (connected) {
    statusText.textContent = sessionCount === 1
      ? `Connected · port ${ports[0]}`
      : `Connected · ${sessionCount} sessions`;
    notice.hidden = true;
    return;
  }

  statusText.textContent = 'Not connected';
  noticeText.textContent = 'Start your MCP client on this machine, then reconnect.';
  notice.hidden = false;
}

/** Find the AlienMcp group, creating it around the active tab if needed. */
async function ensureGroup(): Promise<number> {
  const groups = await chrome.tabGroups.query({ title: GROUP_NAME });
  if (groups.length > 0) {
    alienGroupId = groups[0].id;
    return alienGroupId;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) throw new Error('No active tab');

  const groupId = await chrome.tabs.group({ tabIds: [activeTab.id] });
  await chrome.tabGroups.update(groupId, {
    title: GROUP_NAME,
    color: GROUP_COLOR,
    collapsed: false,
  });

  alienGroupId = groupId;
  return groupId;
}

async function loadTabs(): Promise<void> {
  const groups = await chrome.tabGroups.query({ title: GROUP_NAME });
  alienGroupId = groups.length > 0 ? groups[0].id : null;

  const allTabs = await chrome.tabs.query({});
  const shared = allTabs.filter((t) => t.groupId === alienGroupId && alienGroupId !== null);
  const rest = allTabs.filter((t) => t.groupId !== alienGroupId || alienGroupId === null);

  groupCount.textContent = `${shared.length}`;
  restCount.textContent = `${rest.length}`;

  sharedList.replaceChildren();
  if (shared.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nothing shared yet. Add this tab to let your assistant work on it.';
    sharedList.appendChild(empty);
  } else {
    shared.forEach((tab) => sharedList.appendChild(createTabRow(tab, true)));
  }

  restList.replaceChildren();
  restSection.hidden = rest.length === 0;
  rest.forEach((tab) => restList.appendChild(createTabRow(tab, false)));
}

function createTabRow(tab: chrome.tabs.Tab, shared: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = `tab${tab.active ? ' active' : ''}`;

  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.className = 'favicon';
    img.src = tab.favIconUrl;
    img.alt = '';
    img.addEventListener('error', () => img.replaceWith(blankFavicon()));
    row.appendChild(img);
  } else {
    row.appendChild(blankFavicon());
  }

  const text = document.createElement('div');
  text.className = 'tab-text';

  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Untitled';

  const url = document.createElement('div');
  url.className = 'tab-url';
  url.textContent = hostOf(tab.url);

  text.append(title, url);
  text.addEventListener('click', () => {
    if (!tab.id) return;
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
    window.close();
  });
  row.appendChild(text);

  const toggle = document.createElement('button');
  toggle.className = 'toggle';
  toggle.textContent = shared ? 'Remove' : 'Share';
  toggle.title = shared
    ? 'Stop sharing this tab with your assistant'
    : 'Let your assistant work on this tab';
  toggle.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!tab.id) return;
    if (shared) {
      await chrome.tabs.ungroup(tab.id);
    } else {
      const gid = await ensureGroup();
      await chrome.tabs.group({ tabIds: [tab.id], groupId: gid });
    }
    loadTabs();
  });
  row.appendChild(toggle);

  return row;
}

function blankFavicon(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'favicon-blank';
  return el;
}

/** Show the host rather than the full URL: it is what identifies a tab. */
function hostOf(raw: string | undefined): string {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.host || u.protocol.replace(':', '');
  } catch {
    return raw.slice(0, 40);
  }
}

chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (chrome.runtime.lastError) { updateStatus(false); return; }
  updateStatus(response?.connected ?? false, response?.sessionCount ?? 0, response?.ports ?? []);
});

reconnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'reconnect' }, (response) => {
    if (chrome.runtime.lastError) { updateStatus(false); return; }
    updateStatus(response?.connected ?? false, response?.sessionCount ?? 0, response?.ports ?? []);
  });
});

addTabBtn.addEventListener('click', async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;
  const gid = await ensureGroup();
  await chrome.tabs.group({ tabIds: [activeTab.id], groupId: gid });
  loadTabs();
});

loadTabs();
