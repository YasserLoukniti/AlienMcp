import { z } from 'zod';
export function registerPdfTool(server, bridge) {
    server.registerTool('alien_pdf', {
        description: 'Generate a PDF of the current page',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
            landscape: z.boolean().optional().describe('Landscape orientation'),
            printBackground: z.boolean().optional().describe('Print background graphics (default: true)'),
            scale: z.number().optional().describe('Scale factor (default: 1)'),
        },
    }, async (args) => {
        const result = await bridge.send('pdf', args);
        return {
            content: [
                {
                    type: 'resource',
                    resource: {
                        uri: `data:application/pdf;base64,${result.data}`,
                        mimeType: 'application/pdf',
                        text: result.data,
                    },
                },
                {
                    type: 'text',
                    text: `PDF generated (~${result.pageCount} pages)`,
                },
            ],
        };
    });
}
//# sourceMappingURL=pdf.js.map