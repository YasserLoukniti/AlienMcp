import { resolveTabId } from './group-utils';

export async function handleFindElement(args: Record<string, unknown>): Promise<{
  elements: Array<{
    tag: string;
    text: string;
    attributes: Record<string, string>;
    rect: { x: number; y: number; width: number; height: number };
    index: number;
  }>;
}> {
  const selector = args.selector as string | undefined;
  const text = args.text as string | undefined;
  const xpath = args.xpath as string | undefined;
  const role = args.role as string | undefined;
  const limit = (args.limit as number) || 20;

  const tabId = await resolveTabId(args);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (sel: string | null, txt: string | null, xp: string | null, rl: string | null, lim: number) => {
      let elements: Element[] = [];

      if (sel) {
        elements = Array.from(document.querySelectorAll(sel));
      } else if (txt) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) =>
            node.textContent?.includes(txt!) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
        });
        const seen = new Set<Element>();
        while (walker.nextNode()) {
          const parent = walker.currentNode.parentElement;
          if (parent && !seen.has(parent)) {
            seen.add(parent);
            elements.push(parent);
          }
        }
      } else if (xp) {
        const result = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i);
          if (node instanceof Element) elements.push(node);
        }
      } else if (rl) {
        elements = Array.from(document.querySelectorAll(`[role="${rl}"]`));
      }

      return elements.slice(0, lim).map((el, i) => {
        const rect = el.getBoundingClientRect();
        const attrs: Record<string, string> = {};
        for (let a = 0; a < el.attributes.length; a++) {
          const attr = el.attributes[a];
          attrs[attr.name] = attr.value;
        }
        return {
          tag: el.tagName.toLowerCase(),
          text: (el as HTMLElement).innerText?.slice(0, 200) || '',
          attributes: attrs,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          index: i,
        };
      });
    },
    args: [selector || null, text || null, xpath || null, role || null, limit],
  });

  const elements = (results[0]?.result || []) as Array<{
    tag: string;
    text: string;
    attributes: Record<string, string>;
    rect: { x: number; y: number; width: number; height: number };
    index: number;
  }>;

  return { elements };
}
