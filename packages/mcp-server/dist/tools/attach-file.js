import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
/**
 * Read a file from the MCP server's filesystem and attach it to a file
 * input on the page via DataTransfer. Avoids embedding multi-hundred-KB
 * base64 payloads in the LLM context — Claude only passes a path.
 *
 * Use case: ATS forms with required CV upload (Greenhouse, Lever, Kula,
 * Workable, custom Dropzone widgets). The agent identifies the file
 * input selector visually then asks the server to upload.
 */
export function registerAttachFileTool(server, bridge) {
    server.registerTool('alien_attach_cv', {
        description: "Attach a file from the MCP server's local disk to a file input on the page. The server reads the file at `path`, encodes it as base64, and uploads via the alien_form_input handler (DataTransfer / native setter — works on Greenhouse, Lever, Workable, Kula, Pinpoint, Teamtailor, most custom Dropzone widgets). Use this when a form requires a CV/resume upload and you don't want to ship the binary through the LLM context.",
        inputSchema: {
            tabId: z.number().optional().describe('Tab ID (default: active tab)'),
            selector: z.string().describe('CSS selector of the file input (or any descendant of a Dropzone wrapper — fall back to the inner <input type="file"> automatically).'),
            path: z.string().describe('Absolute path to the file on the MCP server. Defaults to the candidate CV path passed via env CANDIDATE_CV_PATH if omitted.').optional(),
            fileName: z.string().optional().describe('Filename to expose to the page (default: derived from path or "cv.pdf").'),
            fileMime: z.string().optional().describe('MIME type (default: application/pdf).'),
        },
    }, async (args) => {
        const path = (args.path && args.path.length > 0) ? args.path : process.env.CANDIDATE_CV_PATH;
        if (!path) {
            throw new Error('alien_attach_cv: no path provided and CANDIDATE_CV_PATH env is unset.');
        }
        let buffer;
        try {
            buffer = await readFile(path);
        }
        catch (err) {
            throw new Error(`alien_attach_cv: cannot read ${path}: ${err instanceof Error ? err.message : String(err)}`);
        }
        const base64 = buffer.toString('base64');
        const fileName = args.fileName ?? basename(path);
        const fileMime = args.fileMime ?? (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const bridgeArgs = {
            selector: args.selector,
            value: base64,
            type: 'file',
            fileName,
            fileMime,
        };
        if (typeof args.tabId === 'number')
            bridgeArgs.tabId = args.tabId;
        const result = await bridge.send('formInput', bridgeArgs);
        return {
            content: [
                {
                    type: 'text',
                    text: result.field
                        ? `Attached file ${result.field.fileName ?? fileName} (${result.field.size ?? buffer.length} bytes) to <${result.field.tag}> name="${result.field.name}"`
                        : `Attached file ${fileName} (${buffer.length} bytes)`,
                },
            ],
        };
    });
}
//# sourceMappingURL=attach-file.js.map