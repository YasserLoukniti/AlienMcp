// AlienMcp Content Script
// Injected into all pages - handles messages from the background service worker

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'getPageContent': {
        const mode = message.mode || 'text';
        let content: string;

        if (message.selector) {
          const el = document.querySelector(message.selector);
          if (!el) {
            sendResponse({ error: `Element not found: ${message.selector}` });
            return;
          }
          content = mode === 'html' ? el.outerHTML : (el as HTMLElement).innerText;
        } else if (mode === 'html') {
          content = document.documentElement.outerHTML;
        } else if (mode === 'selection') {
          content = window.getSelection()?.toString() || '';
        } else {
          content = document.body.innerText;
        }

        sendResponse({
          content,
          url: location.href,
          title: document.title,
        });
        break;
      }

      case 'clickElement': {
        const el = document.querySelector(message.selector);
        if (!el) {
          sendResponse({ error: `Element not found: ${message.selector}` });
          return;
        }
        (el as HTMLElement).click();
        sendResponse({
          success: true,
          element: {
            tag: el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.slice(0, 200) || '',
          },
        });
        break;
      }

      case 'findElements': {
        const elements = document.querySelectorAll(message.selector);
        const results = Array.from(elements).slice(0, message.limit || 20).map((el, i) => {
          const rect = el.getBoundingClientRect();
          const attrs: Record<string, string> = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return {
            tag: el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.slice(0, 200) || '',
            attributes: attrs,
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            index: i,
          };
        });
        sendResponse({ elements: results });
        break;
      }

      case 'executeJs': {
        // Content scripts run in an isolated world with their OWN CSP, which
        // is permissive by default — `Function` and `eval` work here even
        // when the page bans them. This is the only path we have on
        // strict-CSP sites like WTTJ.
        // The result must be cloneable for chrome.runtime.sendMessage; we
        // serialize through JSON to enforce that.
        (async () => {
          try {
            const src = String(message.code || '');
            // eslint-disable-next-line no-new-func
            const fn = new Function(`return (async () => (${src}))();`);
            const value = await fn();
            // Verify the value can be marshaled. JSON.stringify throws on
            // cycles / functions / undefined-only — clamp to safe shapes.
            let safe: unknown = value;
            try {
              JSON.stringify(value);
            } catch {
              safe = String(value);
            }
            sendResponse({ ok: true, value: safe });
          } catch (e) {
            sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        })();
        return true; // keep channel open for the async sendResponse
      }

      default:
        sendResponse({ error: `Unknown action: ${message.action}` });
    }
  } catch (err) {
    sendResponse({ error: err instanceof Error ? err.message : String(err) });
  }

  return true; // Keep message channel open for async response
});

console.log('AlienMcp content script loaded');
