export function registerContextTool(server, bridge) {
    server.registerTool('alien_context', {
        description: 'Get current browser context: active tab info, tab count, connection status. Call this first to know where you are.',
    }, async () => {
        const result = await bridge.send('context');
        return {
            content: [
                {
                    type: 'text',
                    text: [
                        `Active Tab: [${result.activeTab.id}] ${result.activeTab.title}`,
                        `URL: ${result.activeTab.url}`,
                        `Total tabs: ${result.tabCount}`,
                        `Window: ${result.windowId}`,
                    ].join('\n'),
                },
            ],
        };
    });
}
//# sourceMappingURL=context.js.map