import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Bridge } from '../bridge.js';
/**
 * Read a file from the MCP server's filesystem and attach it to a file
 * input on the page via DataTransfer. Avoids embedding multi-hundred-KB
 * base64 payloads in the LLM context — Claude only passes a path.
 *
 * Use case: ATS forms with required CV upload (Greenhouse, Lever, Kula,
 * Workable, custom Dropzone widgets). The agent identifies the file
 * input selector visually then asks the server to upload.
 */
export declare function registerAttachFileTool(server: McpServer, bridge: Bridge): void;
//# sourceMappingURL=attach-file.d.ts.map