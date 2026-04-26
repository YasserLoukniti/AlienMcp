import { z } from 'zod';
export function registerFormInputTool(server, bridge) {
    server.registerTool('alien_form_input', {
        description: 'Fill form fields (input, textarea, select, checkbox)',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            selector: z.string().describe('CSS selector of the form field'),
            value: z.string().describe('Value to set'),
            type: z.enum(['text', 'select', 'checkbox', 'radio', 'file']).optional().describe('Field type (auto-detected if omitted)'),
            clear: z.boolean().optional().describe('Clear field before typing (default: true)'),
        },
    }, async (args) => {
        const result = await bridge.send('formInput', args);
        return {
            content: [
                {
                    type: 'text',
                    text: result.field
                        ? `Filled <${result.field.tag}> name="${result.field.name}" type="${result.field.type}" with "${args.value}"`
                        : `Form input completed`,
                },
            ],
        };
    });
}
//# sourceMappingURL=form-input.js.map