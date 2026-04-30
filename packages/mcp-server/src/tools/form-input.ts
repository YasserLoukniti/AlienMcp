import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Bridge } from '../bridge.js';

export function registerFormInputTool(server: McpServer, bridge: Bridge): void {
  server.registerTool(
    'alien_form_input',
    {
      description: 'Fill form fields. Auto-detects the field kind (text, textarea, select, checkbox, radio, file). For file inputs, pass the file content as base64 in `value` (with or without a `data:<mime>;base64,` prefix) and optionally `fileName` + `fileMime`. For checkbox/radio, pass value:"true"/"false" — the handler clicks the wrapping <label> when present so React state updates correctly.',
      inputSchema: {
        tabId: z.number().optional().describe('Tab ID (default: active tab)'),
        selector: z.string().describe('CSS selector of the form field'),
        value: z.string().describe('Value to set. For file inputs: base64 payload.'),
        type: z.enum(['text', 'select', 'checkbox', 'radio', 'file']).optional().describe('Field type (auto-detected if omitted)'),
        clear: z.boolean().optional().describe('Clear field before typing (default: true)'),
        fileName: z.string().optional().describe('File name when uploading (default: "upload.bin")'),
        fileMime: z.string().optional().describe('MIME type when uploading (default: "application/octet-stream")'),
      },
    },
    async (args) => {
      const result = await bridge.send('formInput', args) as {
        success: boolean;
        field?: { tag: string; type: string; name: string; fileName?: string; size?: number };
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: result.field
              ? result.field.type === 'file'
                ? `Attached file ${result.field.fileName ?? '?'} (${result.field.size ?? 0} bytes) to <${result.field.tag}> name="${result.field.name}"`
                : `Filled <${result.field.tag}> name="${result.field.name}" type="${result.field.type}"`
              : `Form input completed`,
          },
        ],
      };
    },
  );
}
