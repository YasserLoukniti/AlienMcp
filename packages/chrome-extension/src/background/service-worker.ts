import { WebSocketClient } from './websocket-client';
import { CommandRouter } from './command-router';

const WS_URL = 'ws://localhost:7888';

const router = new CommandRouter();
let wsClient: WebSocketClient | null = null;
let initialized = false;

function initialize(): void {
  if (initialized && wsClient) return;
  initialized = true;

  wsClient = new WebSocketClient(WS_URL);

  wsClient.onMessage(async (message) => {
    let requestId: string | undefined;
    try {
      const request = JSON.parse(message);
      requestId = request.id;

      if (!request.command) return; // Ignore non-command messages

      const result = await router.route(request.command, request.args || {});
      wsClient!.send(JSON.stringify({
        id: requestId,
        data: result,
        error: null,
      }));
    } catch (err) {
      if (requestId) {
        wsClient!.send(JSON.stringify({
          id: requestId,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    }
  });

  wsClient.connect();

  // Keep service worker alive with alarms
  chrome.alarms.create('heartbeat', { periodInMinutes: 0.5 });
  console.log('AlienMcp initialized, connecting to', WS_URL);
}

// Handle alarms for keepalive
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') {
    if (!wsClient) {
      initialize();
    } else if (wsClient.isConnected()) {
      wsClient.send(JSON.stringify({ type: 'ping' }));
    }
    // If not connected, the WebSocketClient handles reconnection internally
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({ connected: wsClient?.isConnected() ?? false });
  } else if (message.action === 'reconnect') {
    if (wsClient) {
      wsClient.disconnect();
    }
    initialized = false;
    wsClient = null;
    initialize();
    setTimeout(() => {
      sendResponse({ connected: wsClient?.isConnected() ?? false });
    }, 2000);
    return true; // Async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AlienMcp extension installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('AlienMcp extension startup');
});

// Single initialization point
initialize();
