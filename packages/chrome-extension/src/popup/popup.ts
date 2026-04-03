const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;
const reconnectBtn = document.getElementById('reconnect-btn')!;
const tabsList = document.getElementById('tabs-list')!;
const addTabBtn = document.getElementById('add-tab-btn')!;
const groupCount = document.getElementById('group-count')!;

const GROUP_NAME = 'AlienMcp';
const GROUP_COLOR: chrome.tabGroups.ColorEnum = 'green';

let alienGroupId: number | null = null;
let groupTabIds: Set<number> = new Set();

function updateStatus(connected: boolean, sessionCount = 0, ports: number[] = []): void {
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  if (connected) {
    statusText.textContent = sessionCount === 1
      ? `Connected (1 session, port ${ports[0]})`
      : `Connected (${sessionCount} sessions, ports ${ports.join(', ')})`;
  } else {
    statusText.textContent = 'Disconnected';
  }
}

// Find or create the AlienMcp tab group
async function ensureGroup(): Promise<number> {
  // Check if group already exists
  const groups = await chrome.tabGroups.query({ title: GROUP_NAME });
  if (groups.length > 0) {
    alienGroupId = groups[0].id;
    return alienGroupId;
  }

  // Get active tab to seed the group
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) throw new Error('No active tab');

  // Create group with current tab
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
  // Find existing group
  const groups = await chrome.tabGroups.query({ title: GROUP_NAME });
  alienGroupId = groups.length > 0 ? groups[0].id : null;

  // Get all tabs
  const allTabs = await chrome.tabs.query({});

  // Find tabs in our group
  groupTabIds = new Set(
    allTabs.filter((t) => t.groupId === alienGroupId).map((t) => t.id!)
  );

  groupCount.textContent = `${groupTabIds.size}`;

  // Show grouped tabs first, then others
  const grouped = allTabs.filter((t) => groupTabIds.has(t.id!));
  const ungrouped = allTabs.filter((t) => !groupTabIds.has(t.id!));

  tabsList.innerHTML = '';

  if (grouped.length > 0) {
    const label = document.createElement('div');
    label.className = 'group-label alien';
    label.textContent = `👽 ${GROUP_NAME} (${grouped.length})`;
    tabsList.appendChild(label);
    grouped.forEach((tab) => tabsList.appendChild(createTabItem(tab, true)));
  }

  if (ungrouped.length > 0) {
    const label = document.createElement('div');
    label.className = 'group-label other';
    label.textContent = `Other tabs (${ungrouped.length})`;
    tabsList.appendChild(label);
    ungrouped.forEach((tab) => tabsList.appendChild(createTabItem(tab, false)));
  }
}

function createTabItem(tab: chrome.tabs.Tab, inGroup: boolean): HTMLElement {
  const item = document.createElement('div');
  item.className = `tab-item${tab.active ? ' active' : ''}${inGroup ? ' in-group' : ''}`;

  item.innerHTML = `
    <img class="tab-favicon" src="${tab.favIconUrl || ''}" onerror="this.style.display='none'" />
    <div class="tab-info">
      <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
      <div class="tab-url">${escapeHtml(truncate(tab.url || '', 38))}</div>
    </div>
    <button class="btn-group-toggle" title="${inGroup ? 'Remove from group' : 'Add to group'}">${inGroup ? '−' : '+'}</button>
  `;

  // Click tab title to activate
  item.querySelector('.tab-info')!.addEventListener('click', () => {
    if (tab.id) {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
      setTimeout(loadTabs, 200);
    }
  });

  // Click +/- to add/remove from group
  item.querySelector('.btn-group-toggle')!.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!tab.id) return;

    if (inGroup) {
      // Remove from group
      await chrome.tabs.ungroup(tab.id);
    } else {
      // Add to group
      const gid = await ensureGroup();
      await chrome.tabs.group({ tabIds: [tab.id], groupId: gid });
    }
    loadTabs();
  });

  return item;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// Status check
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

// Add current tab to group
addTabBtn.addEventListener('click', async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;
  const gid = await ensureGroup();
  await chrome.tabs.group({ tabIds: [activeTab.id], groupId: gid });
  loadTabs();
});

// Load on open
loadTabs();
