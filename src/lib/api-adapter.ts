import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { fail, readSearch, readVersion } from "./read";
import { normalizeNlmResponse, searchParams } from "./search-contract";

function requestParams(path: string, params: Record<string, unknown>): { path: string; params: Record<string, unknown> } {
  if (!path.startsWith("/") || path.startsWith("//")) fail("Unsupported ICD-10-CM path");
  const url = new URL(path, "https://clinicaltables.nlm.nih.gov");
  if (url.hash) fail("Fragments are not supported");
  const merged = { ...params };
  for (const [key, value] of url.searchParams) {
    if (key in merged) fail("Duplicate ICD-10-CM parameter");
    merged[key] = value;
  }
  return { path: url.pathname, params: merged };
}
function expectedVersion(params: Record<string, unknown>): string | undefined {
  const expected = params.expected_source_version;
  if (expected !== undefined && (typeof expected !== "string" || !expected.trim() || expected.length > 200)) fail("expected_source_version must be an observed NLM source label");
  delete params.expected_source_version;
  return expected;
}
function paging(params: Record<string, unknown>, returned: number) {
  const count = Number(params.count ?? params.maxList);
  const offset = Number(params.offset ?? 0);
  const canContinue = params.count !== undefined && returned === count && offset + count < 7500;
  return { count, offset, returned, reported_total_is_exact: false, reported_total_cap: 10000,
    retrieval_limit: 7500, complete: false, next_offset_candidate: canContinue ? offset + count : null,
    next_count_candidate: canContinue ? Math.min(count, 7500 - offset - count) : null };
}
export function createIcd10ApiFetch(): ApiFetchFn {
  return async (request) => {
    if (request.method !== "GET" || request.body !== undefined) fail("ICD-10-CM supports bodyless GET");
    const input = requestParams(request.path, request.params ?? {});
    if (input.path === "/icd10cm/source") {
      if (Object.keys(input.params).length) fail("Source discovery takes no parameters");
      return { status: 200, data: await readVersion() };
    }
    if (!["/icd10cm/search", "/api/icd10cm/v3/search"].includes(input.path)) fail("Unsupported ICD-10-CM path", 404);
    const expected = expectedVersion(input.params);
    const params = searchParams(input.params);
    const [raw, source] = await Promise.all([readSearch(params), readVersion()]);
    if (expected !== undefined && source.source_version_label !== expected) fail("NLM source metadata unavailable or changed; inspect /icd10cm/source before continuing", 409);
    const data = normalizeNlmResponse(raw, params);
    return { status: 200, data: { ...data, _icd10: {
      source, api_version: "v3", request: params, retrieved_at: new Date().toISOString(),
      ...paging(params, data.codes.length), service_date_validity: "not established",
      source_url: "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search",
      note: "Source year is observed from NLM documentation, not certified by this response. No historical release selection, billability or service-date eligibility is inferred.",
    } } };
  };
}
