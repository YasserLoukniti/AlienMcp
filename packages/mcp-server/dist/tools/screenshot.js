import { z } from 'zod';
export function registerScreenshotTool(server, bridge) {
    server.registerTool('alien_screenshot', {
        description: 'Capture a screenshot of the visible tab',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID to capture (default: active tab)'),
            format: z.enum(['png', 'jpeg']).optional().describe('Image format'),
            quality: z.number().min(0).max(100).optional().describe('JPEG quality (0-100)'),
            fullPage: z.boolean().optional().describe('Capture full page (not just viewport)'),
        },
    }, async (args) => {
        const result = await bridge.send('screenshot', args);
        return {
            content: [
                {
                    type: 'image',
                    data: result.image,
                    mimeType: args.format === 'jpeg' ? 'image/jpeg' : 'image/png',
                },
                {
                    type: 'text',
                    text: `Screenshot: ${result.width}x${result.height}\nTab: ${result.title}\nURL: ${result.url}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=screenshot.js.map