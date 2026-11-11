import { fail } from "./read";

export function integer(value: unknown, fallback: number, min: number, max: number): number {
  const input = value ?? fallback;
  if ((typeof input !== "number" && typeof input !== "string") || !/^\d+$/.test(String(input)) || Number(input) < min || Number(input) > max) fail("Invalid NLM paging value");
  return Number(input);
}
function fieldList(value: unknown, aliases = false): void {
  if (typeof value !== "string" || value.length > 1000 || value.split(",").some(field => {
    const [name, alias, ...rest] = field.split(":");
    return !["code", "name"].includes(name) || rest.length > 0 || (alias !== undefined && (!aliases || !/^[A-Za-z][A-Za-z0-9_]*$/.test(alias)));
  })) fail("Unsupported ICD-10-CM field list");
}
export function searchParams(input: Record<string, unknown>): Record<string, unknown> {
  if (Object.keys(input).some(key => !["terms", "maxList", "count", "offset", "sf", "df", "ef", "cf", "q"].includes(key))) fail("Unsupported ICD-10-CM parameter");
  if (typeof input.terms !== "string" || !input.terms.trim() || input.terms.length > 2000) fail("terms is required and must be at most 2000 characters");
  const params: Record<string, unknown> = { sf: "code,name", df: "code,name", ef: "code,name", ...input };
  if (input.count !== undefined || input.offset !== undefined) {
    if (input.maxList !== undefined) fail("Use count/offset or maxList, not both");
    params.count = integer(input.count, 500, 1, 500); params.offset = integer(input.offset, 0, 0, 7499);
    if (Number(params.count) + Number(params.offset) > 7500) fail("NLM offset + count cannot exceed 7500");
  } else params.maxList = input.maxList === "" ? 500 : integer(input.maxList, 500, 1, 500);
  for (const key of ["sf", "df", "ef"]) fieldList(params[key], key === "ef");
  if (params.cf !== undefined && !["code", "name"].includes(String(params.cf))) fail("Unsupported code field");
  if (params.q !== undefined && (typeof params.q !== "string" || params.q.length > 2000)) fail("Invalid q");
  return params;
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function normalizeNlmResponse(raw: unknown, params: Record<string, unknown>): { total: number; codes: Array<{ code: string; name: string }>; native: unknown[] } {
  if (!Array.isArray(raw) || raw.length < 4 || !Number.isSafeInteger(raw[0]) || raw[0] < 0 || !Array.isArray(raw[1]) || raw[1].some(value => typeof value !== "string") || !Array.isArray(raw[3]) || raw[1].length !== raw[3].length || raw[3].some(row => !Array.isArray(row))) fail("Invalid NLM compact response", 502);
  const count = raw[1].length;
  if (count > Number(params.count ?? params.maxList)) fail("NLM exceeded requested page size", 502);
  const extras = raw[2];
  if (extras !== null && (!object(extras) || Object.values(extras).some(values => !Array.isArray(values) || values.length !== count))) fail("Misaligned NLM extra fields", 502);
  if (raw[4] !== undefined && (!Array.isArray(raw[4]) || raw[4].length !== count)) fail("Misaligned NLM code systems", 502);
  const codes = raw[1].map((_code, index) => ({ code: valueFor("code", index, raw, params), name: valueFor("name", index, raw, params) }));
  return { total: raw[0], codes, native: raw };
}
function valueFor(field: string, index: number, raw: unknown[], params: Record<string, unknown>): string {
  // SAFETY: normalizeNlmResponse validates compact arrays before this helper.
  const extras = raw[2] as Record<string, unknown[]> | null;
  const extraName = String(params.ef).split(",").map(part => part.split(":")).find(pair => pair[0] === field);
  const fromExtra = extraName ? extras?.[extraName[1] ?? extraName[0]]?.[index] : undefined;
  const displayIndex = String(params.df).split(",").indexOf(field);
  const display = raw[3] as unknown[][];
  const value = fromExtra ?? (displayIndex >= 0 ? display[index][displayIndex] : undefined) ?? ((params.cf ?? "code") === field ? (raw[1] as string[])[index] : undefined);
  return typeof value === "string" ? value : "";
}
