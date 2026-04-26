export interface SessionInfo {
  port: number;
  sessionId: string;
  label: string;
  groupId?: number;
}

const byPort = new Map<number, SessionInfo>();

export const LEGACY_GROUP_NAME = 'AlienMcp';

export function setHello(port: number, sessionId: string, label: string): SessionInfo {
  const existing = byPort.get(port);
  if (existing) {
    existing.sessionId = sessionId;
    existing.label = label;
    return existing;
  }
  const info: SessionInfo = { port, sessionId, label };
  byPort.set(port, info);
  return info;
}

export function setLabel(sessionId: string, label: string): SessionInfo | undefined {
  for (const info of byPort.values()) {
    if (info.sessionId === sessionId) {
      info.label = label;
      return info;
    }
  }
  return undefined;
}

export function getByPort(port: number): SessionInfo | undefined {
  return byPort.get(port);
}

export function getBySessionId(sessionId: string): SessionInfo | undefined {
  for (const info of byPort.values()) {
    if (info.sessionId === sessionId) return info;
  }
  return undefined;
}

export function setGroupId(sessionId: string, groupId: number): void {
  const info = getBySessionId(sessionId);
  if (info) info.groupId = groupId;
}

export function removePort(port: number): void {
  byPort.delete(port);
}

export function getGroupName(label: string): string {
  return `AlienMcp · ${label}`;
}
