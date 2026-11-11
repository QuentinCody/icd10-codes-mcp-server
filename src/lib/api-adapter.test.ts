import { afterEach, expect, it, vi } from "vitest";
import { createIcd10ApiFetch } from "./api-adapter";
import { icd10Catalog } from "../spec/catalog";
afterEach(() => vi.unstubAllGlobals());
const source = (year = "2026") => `<table><tr><td><a href="/apidoc/icd10cm/v3/doc.html">ICD-10-CM</a></td><td>Data version: ${year}; 74,719 records</td></tr></table>`;
function upstream(year = "2026", native: unknown = [1, ["E11.9"], null, [["E11.9", "Type 2 diabetes"]]]) {
  const fetcher = vi.fn(async (url: URL) => url.pathname === "/" ? new Response(source(year)) : Response.json(native));
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
it("preserves established fields and native response while qualifying source year", async () => {
  upstream();
  expect(await createIcd10ApiFetch()({ method: "GET", path: "/icd10cm/search", params: { terms: "E11.9" } })).toMatchObject({ status: 200, data: {
    total: 1, codes: [{ code: "E11.9", name: "Type 2 diabetes" }], native: expect.any(Array), _icd10: { api_version: "v3", source: { source_code_set_year: 2026, response_release_verified: false, effective_start: null }, complete: false },
  } });
});
it("retains current reads when metadata is unavailable without inventing a year", async () => {
  vi.stubGlobal("fetch", async (url: URL) => url.pathname === "/" ? new Response("unavailable", { status: 503 }) : Response.json([0, [], null, []]));
  expect(await createIcd10ApiFetch()({ method: "GET", path: "/icd10cm/search", params: { terms: "x" } })).toMatchObject({ data: { total: 0, codes: [], _icd10: { source: { observation_status: "unavailable", source_code_set_year: null } } } });
});
it("rejects observed version drift instead of silently switching years", async () => {
  upstream("2027");
  await expect(createIcd10ApiFetch()({ method: "GET", path: "/icd10cm/search", params: { terms: "x", expected_source_version: "2026" } })).rejects.toMatchObject({ status: 409 });
});
it("supports the existing upstream path and inline search parameters", async () => {
  const fetcher = upstream();
  await createIcd10ApiFetch()({ method: "GET", path: "/api/icd10cm/v3/search?terms=E11.9&count=10&offset=0" });
  const url = fetcher.mock.calls.map(([value]) => value).find(value => value.pathname.includes("search"));
  expect(url?.searchParams.get("count")).toBe("10"); expect(url?.searchParams.has("maxList")).toBe(false);
});
it("bounds the next-page candidate at the provider's retrieval window", async () => {
  upstream("2026", [10000, ["E11.9"], null, [["E11.9", "diabetes"]]]);
  const adapter = createIcd10ApiFetch();
  expect(await adapter({ method: "GET", path: "/icd10cm/search", params: { terms: "E11", count: 1, offset: 7498 } })).toMatchObject({ data: { _icd10: { reported_total_is_exact: false, next_offset_candidate: 7499, next_count_candidate: 1 } } });
  expect(await adapter({ method: "GET", path: "/icd10cm/search", params: { terms: "E11", count: 1, offset: 7499 } })).toMatchObject({ data: { _icd10: { next_offset_candidate: null, complete: false } } });
});
it.each([
  { method: "POST", path: "/icd10cm/search" }, { method: "GET", path: "/icd10cm/source", params: { year: "2027" } },
  { method: "GET", path: "https://evil.example/" }, { method: "GET", path: "/api/other/v3/search" },
  { method: "GET", path: "/icd10cm/search?terms=a", params: { terms: "b" } },
])("rejects unsupported routing or parameters before fetch %#", async request => {
  const fetcher = upstream(); await expect(createIcd10ApiFetch()(request)).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
});
it("executes the published version-check workflow", async () => {
  upstream(); const adapter = createIcd10ApiFetch();
  const api = { get: async (path: string, params?: Record<string, unknown>) => (await adapter({ method: "GET", path, params })).data };
  const recipe = icd10Catalog.workflows?.[0].code;
  const result = await new Function("api", `return (async () => {${recipe}})();`)(api);
  expect(result).toMatchObject({ codes: [{ code: "E11.9" }], _icd10: { request: { count: 25, offset: 0 }, source: { source_version_label: "2026" } } });
});
