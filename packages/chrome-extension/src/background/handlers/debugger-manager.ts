/**
 * Shared debugger session manager.
 * Multiple handlers (execute-js, console, network, hover, type, screenshot)
 * all need chrome.debugger. This manager uses reference counting so only
 * one attach/detach per tab, even with concurrent usage.
 */

interface Session {
  refCount: number;
  domains: Set<string>; // enabled CDP domains (e.g. 'Runtime', 'Network')
}

const sessions = new Map<number, Session>();

/** Acquire a debugger session for a tab. Safe to call multiple times. */
export async function acquire(tabId: number): Promise<void> {
  const session = sessions.get(tabId);
  if (session) {
    session.refCount++;
    return;
  }

  await chrome.debugger.attach({ tabId }, '1.3');
  sessions.set(tabId, { refCount: 1, domains: new Set() });
}

/** Release a debugger session. Only detaches when refCount hits 0. */
export async function release(tabId: number): Promise<void> {
  const session = sessions.get(tabId);
  if (!session) return;

  session.refCount--;
  if (session.refCount <= 0) {
    sessions.delete(tabId);
    try {
      await chrome.debugger.detach({ tabId });
    } catch {
      // Already detached (user closed infobar, tab closed, etc.)
    }
  }
}

/** Send a CDP command on an already-acquired session. */
export async function sendCommand(
  tabId: number,
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

/** Enable a CDP domain if not already enabled for this tab. */
export async function enableDomain(tabId: number, domain: string): Promise<void> {
  const session = sessions.get(tabId);
  if (!session) throw new Error(`No debugger session for tab ${tabId}`);

  if (!session.domains.has(domain)) {
    await chrome.debugger.sendCommand({ tabId }, `${domain}.enable`);
    session.domains.add(domain);
  }
}

/** Force-release a tab (e.g. when tab is closed). */
export function forceRelease(tabId: number): void {
  sessions.delete(tabId);
  try {
    chrome.debugger.detach({ tabId });
  } catch {
    // ignore
  }
}

/** Check if a tab has an active debugger session. */
export function hasSession(tabId: number): boolean {
  return sessions.has(tabId);
}
