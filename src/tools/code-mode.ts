import type { McpServer } from "@bio-mcp/shared/mcp";
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
    const registrar = { tool: (...args: unknown[]) => {
        const [name, ...rest] = args;
        // SAFETY: shared factory provides SDK arguments; only the alias changes.
        const register = server.tool.bind(server) as (...values: unknown[]) => void;
        register(name, ...rest); register(`mcp_${String(name)}`, ...rest);
    } };

    const searchTool = createSearchTool({
        prefix: "icd10",
        catalog: icd10Catalog,
    });
    searchTool.register(registrar);

    const executeTool = createExecuteTool({
        prefix: "icd10",
        // Verifiable provenance: icd10_execute results carry a _meta.citation.
        source: { id: "icd10", name: "ICD-10-CM", url: "https://www.cms.gov/medicare/coding-billing/icd-10-codes", license: "U.S. Public Domain" },
        catalog: icd10Catalog,
        apiFetch,
        maxInlineBytes: 30 * 1024,
        stagingThreshold: 30 * 1024,
        timeout: 60000,
        doNamespace: env.ICD10_CODES_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(registrar);
}
