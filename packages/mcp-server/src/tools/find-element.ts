import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerFindElementTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_find_element',
    {
      description: 'Find elements on the page by selector, text, XPath, or ARIA role',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        selector: z.string().optional().describe('CSS selector'),
        text: z.string().optional().describe('Text content to search for'),
        xpath: z.string().optional().describe('XPath expression'),
        role: z.string().optional().describe('ARIA role'),
        limit: z.number().optional().describe('Max number of results'),
      },
    },
    async (args) => {
      const result = await bridge.send('findElement', args) as {
        elements: Array<{
          tag: string;
          text: string;
          attributes: Record<string, string>;
          state?: Record<string, unknown>;
          rect: { x: number; y: number; width: number; height: number };
          index: number;
        }>;
      };

      const summary = result.elements
        .map((el) => {
          const stateBits: string[] = [];
          const s = el.state ?? {};
          if (typeof s.checked === 'boolean') stateBits.push(s.checked ? 'checked' : 'unchecked');
          if (typeof s.value === 'string' && s.value.length > 0) stateBits.push(`value="${s.value.slice(0, 40)}"`);
          if (s.disabled === true) stateBits.push('disabled');
          const stateStr = stateBits.length > 0 ? ` [${stateBits.join(' · ')}]` : '';
          return `[${el.index}] <${el.tag}> "${el.text.slice(0, 80)}"${stateStr} (${el.rect.x},${el.rect.y} ${el.rect.width}x${el.rect.height})`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${result.elements.length} element(s):\n${summary}`,
          },
        ],
      };
    },
  );
}
