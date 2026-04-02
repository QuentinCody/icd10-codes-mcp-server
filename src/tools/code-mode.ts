import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { icd10Catalog } from "../spec/catalog";
import { createIcd10ApiFetch } from "../lib/api-adapter";

interface CodeModeEnv {
    ICD10_CODES_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createIcd10ApiFetch();

    const searchTool = createSearchTool({
        prefix: "icd10",
        catalog: icd10Catalog,
    });
    searchTool.register(server as unknown as { tool: (...args: unknown[]) => void });

    const executeTool = createExecuteTool({
        prefix: "icd10",
        catalog: icd10Catalog,
        apiFetch,
        doNamespace: env.ICD10_CODES_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(server as unknown as { tool: (...args: unknown[]) => void });
}
