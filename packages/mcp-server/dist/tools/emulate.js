import { z } from 'zod';
export function registerEmulateTool(server, bridge) {
    server.registerTool('alien_emulate', {
        description: 'Emulate device, network, geolocation, CPU throttling, color scheme, and more. Combine multiple emulations in one call.',
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active group tab)'),
            device: z.string().optional().describe('Device preset: iphone-14, iphone-15-pro, ipad, pixel-7, galaxy-s24, desktop-hd, desktop-4k, laptop'),
            width: z.number().optional().describe('Custom viewport width (use with height)'),
            height: z.number().optional().describe('Custom viewport height (use with width)'),
            deviceScaleFactor: z.number().optional().describe('Device pixel ratio (default: 1)'),
            mobile: z.boolean().optional().describe('Mobile mode'),
            latitude: z.number().optional().describe('Geolocation latitude'),
            longitude: z.number().optional().describe('Geolocation longitude'),
            accuracy: z.number().optional().describe('Geolocation accuracy in meters'),
            network: z.string().optional().describe('Network throttle: offline, slow-3g, fast-3g, 4g, wifi'),
            cpuSlowdown: z.number().optional().describe('CPU throttle multiplier (e.g. 4 = 4x slower)'),
            userAgent: z.string().optional().describe('Custom User-Agent string'),
            colorScheme: z.enum(['light', 'dark']).optional().describe('Force color scheme'),
            disableCache: z.boolean().optional().describe('Disable browser cache'),
            reset: z.boolean().optional().describe('Reset all emulations to default'),
        },
    }, async (args) => {
        const result = await bridge.send('emulate', args);
        return {
            content: [
                {
                    type: 'text',
                    text: result.active.length > 0
                        ? `Emulation active:\n${result.active.map((a) => `  - ${a}`).join('\n')}`
                        : 'No emulation changes applied',
                },
            ],
        };
    });
}
//# sourceMappingURL=emulate.js.map