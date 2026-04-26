#!/usr/bin/env node
import { startServer } from './server.js';
function parseArgs(argv) {
    const opts = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--http') {
            opts.transport = 'http';
        }
        else if (arg === '--port' || arg === '--http-port') {
            const next = argv[++i];
            if (next)
                opts.httpPort = parseInt(next, 10);
        }
        else if (arg === '--host' || arg === '--http-host') {
            const next = argv[++i];
            if (next)
                opts.httpHost = next;
        }
        else if (arg.startsWith('--port=')) {
            opts.httpPort = parseInt(arg.slice('--port='.length), 10);
        }
        else if (arg.startsWith('--host=')) {
            opts.httpHost = arg.slice('--host='.length);
        }
    }
    if (process.env.MCP_HTTP_PORT) {
        opts.transport = 'http';
        opts.httpPort = parseInt(process.env.MCP_HTTP_PORT, 10);
    }
    if (process.env.MCP_HTTP_HOST) {
        opts.httpHost = process.env.MCP_HTTP_HOST;
    }
    if (process.env.MCP_TRANSPORT === 'http') {
        opts.transport = 'http';
    }
    return opts;
}
const options = parseArgs(process.argv.slice(2));
startServer(options).catch((error) => {
    console.error('Fatal error starting AlienMcp server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map