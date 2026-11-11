import { afterEach, expect, it, vi } from "vitest";
import { McpServer } from "@bio-mcp/shared/mcp";
import { createApiProxyTool } from "@bio-mcp/shared/tools/api-proxy";
import { registerCodeMode } from "./code-mode";
import { registerQueryData } from "./query-data";
import { registerGetSchema } from "./get-schema";
import { createIcd10ApiFetch } from "../lib/api-adapter";
import { icd10Catalog } from "../spec/catalog";
afterEach(() => vi.unstubAllGlobals());

it("registers all eight aliases with both result fields on success/error paths", async () => {
  const server = new McpServer({ name: "fixture", version: "1" });
  // SAFETY: invalid execution never invokes this fixture loader.
  registerCodeMode(server, { CODE_MODE_LOADER: { get: () => ({}) } } as unknown as Parameters<typeof registerCodeMode>[1]);
  registerQueryData(server, {}); registerGetSchema(server, {});
  // SAFETY: access the SDK registry solely to exercise real registered callbacks.
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<unknown> }> })._registeredTools;
  expect(Object.keys(tools)).toHaveLength(8);
  for (const prefix of ["", "mcp_"]) {
    expect(await tools[prefix + "icd10_search"].handler({ query: "source", max_results: 2 }, {})).toMatchObject({ content: expect.any(Array), structuredContent: { success: true } });
    for (const [name, args] of [["icd10_execute", { code: "" }], ["icd10_query_data", { data_access_id: "fixture", sql: "SELECT 1" }], ["icd10_get_schema", { data_access_id: "fixture" }]] as const) {
      expect(await tools[prefix + name].handler(args, {})).toMatchObject({ content: expect.any(Array), structuredContent: expect.any(Object), isError: true });
    }
  }
});
it("stages complete native arrays and observed source context with multibyte text", async () => {
  const description = "α".repeat(20000);
  const native = [1, ["A00"], { code: ["A00"], name: [description] }, [["A00", description]], ["ICD-10-CM"]];
  vi.stubGlobal("fetch", async (url: URL) => url.pathname === "/" ? new Response('<tr><td><a href="/apidoc/icd10cm/v3/doc.html">ICD-10-CM</a></td><td>Data version: 2026; 74719 records</td></tr>') : Response.json(native));
  const stored: unknown[] = [];
  const namespace = { idFromName: (name: string) => name, get: () => ({ fetch: async (request: Request) => {
    if (new URL(request.url).pathname === "/process") {
      // SAFETY: shared staging sends this envelope in the integration fixture.
      const payload = await request.json() as { data: unknown }; stored.push(payload.data);
      return Response.json({ success: true, tables_created: ["codes"], total_rows: 1 });
    }
    return Response.json({ success: true, schema: { tables: { codes: { columns: [{ name: "code" }] } } } });
  } }) };
  const proxy = createApiProxyTool({ apiFetch: createIcd10ApiFetch(), catalog: icd10Catalog, doNamespace: namespace, stagingPrefix: "icd10", maxInlineBytes: 30 * 1024 });
  const result = await proxy.handler({ method: "GET", path: "/icd10cm/search", params: { terms: "A00", count: 1 } }, { sql: () => [] });
  expect(result).toMatchObject({ __staged: true, data_access_id: expect.any(String), _staging: expect.any(Object) });
  expect(stored.map(value => typeof value === "string" ? JSON.parse(value) : value)).toEqual(expect.arrayContaining([expect.objectContaining({ native, _icd10: expect.objectContaining({ source: expect.objectContaining({ source_code_set_year: 2026, response_release_verified: false }) }) })]));
  expect(new TextEncoder().encode(JSON.stringify(result)).byteLength).toBeLessThan(100000);
});
