import { MultiWebSocketClient } from './websocket-client';
import { CommandRouter } from './command-router';
import * as sessionState from './session-state';
import { renameGroup } from './handlers/group-utils';

const router = new CommandRouter();
let wsClient: MultiWebSocketClient | null = null;
let initialized = false;

function initialize(): void {
  if (initialized && wsClient) return;
  initialized = true;

  wsClient = new MultiWebSocketClient();

  wsClient.onMessage(async (message, port) => {
    let requestId: string | undefined;
    try {
      const request = JSON.parse(message);

      if (request.type === 'hello' && typeof request.sessionId === 'string') {
        const label = typeof request.label === 'string' ? request.label : request.sessionId.slice(0, 8);
        sessionState.setHello(port, request.sessionId, label);
        console.log(`AlienMcp: server hello on port ${port}, session=${label}`);
        return;
      }

      if (request.type === 'relabel' && typeof request.sessionId === 'string' && typeof request.label === 'string') {
        const info = sessionState.setLabel(request.sessionId, request.label);
        if (info) {
          await renameGroup(info).catch((err) => console.warn('rename group failed', err));
        }
        return;
      }

      requestId = request.id;
      if (!request.command) return;

      const session = sessionState.getByPort(port);
      const enrichedArgs = {
        ...(request.args || {}),
        __sessionId: session?.sessionId,
      } as Record<string, unknown>;

      const result = await router.route(request.command, enrichedArgs);
      wsClient!.send(JSON.stringify({
        id: requestId,
        data: result,
        error: null,
      }), port);
    } catch (err) {
      if (requestId) {
        wsClient!.send(JSON.stringify({
          id: requestId,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
        }), port);
      }
    }
  });

  wsClient.connect();

  // Keep service worker alive and force periodic port scans.
  // ~10s interval (0.166 min) so a newly-started MCP server is picked up
  // quickly. MV3 accepts sub-minute periods in unpacked / dev mode.
  chrome.alarms.create('heartbeat', { periodInMinutes: 10 / 60 });
  console.log('AlienMcp initialized, scanning ports 7888-7899');
}

// Handle alarms for keepalive + port discovery.
// The setInterval-based scan in MultiWebSocketClient is unreliable under MV3
// (service worker can be suspended for up to 30s). Every heartbeat we:
//   1. keep live connections warm via ping
//   2. re-scan the port range so newly-started MCP servers get picked up
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') {
    if (!wsClient) {
      initialize();
      return;
    }
    for (const port of wsClient.getConnectedPorts()) {
      wsClient.send(JSON.stringify({ type: 'ping' }), port);
    }
    wsClient.scanPorts();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({
      connected: wsClient?.isConnected() ?? false,
      sessionCount: wsClient?.connectedCount() ?? 0,
      ports: wsClient?.getConnectedPorts() ?? [],
    });
  } else if (message.action === 'reconnect') {
    if (wsClient) {
      wsClient.disconnect();
    }
    initialized = false;
    wsClient = null;
    initialize();
    setTimeout(() => {
      sendResponse({
        connected: wsClient?.isConnected() ?? false,
        sessionCount: wsClient?.connectedCount() ?? 0,
        ports: wsClient?.getConnectedPorts() ?? [],
      });
    }, 4000);
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AlienMcp extension installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('AlienMcp extension startup');
});

initialize();
