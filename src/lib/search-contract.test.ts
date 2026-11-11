import { expect, it } from "vitest";
import { normalizeNlmResponse, searchParams } from "./search-contract";

it("preserves the NLM documented compact-array example and established code/name view", () => {
  const native = [71, ["A15.0", "A15.4"], null, [["A15.0", "Tuberculosis of lung"], ["A15.4", "Tuberculosis of intrathoracic lymph nodes"]]];
  expect(normalizeNlmResponse(native, searchParams({ terms: "tuberc" }))).toEqual({ total: 71, native, codes: [{ code: "A15.0", name: "Tuberculosis of lung" }, { code: "A15.4", name: "Tuberculosis of intrathoracic lymph nodes" }] });
});
it("keeps native extra/code-system fields and supports reordered and aliased fields", () => {
  const native = [1, ["Description"], { id: ["A00"], label: ["Description"], extra: [{ untouched: true }] }, [["Description", "A00"]], ["ICD-10-CM"]];
  expect(normalizeNlmResponse(native, searchParams({ terms: "A00", cf: "name", df: "name,code", ef: "code:id,name:label" }))).toEqual({ total: 1, codes: [{ code: "A00", name: "Description" }], native });
});
it("uses count/offset without also sending maxList", () => {
  expect(searchParams({ terms: "E11", count: 500, offset: 7000 })).toMatchObject({ count: 500, offset: 7000 });
  expect(searchParams({ terms: "E11", offset: 0 })).not.toHaveProperty("maxList");
  expect(searchParams({ terms: "E11", maxList: "" }).maxList).toBe(500);
});
it.each([{}, { terms: "" }, { terms: "x", count: 501 }, { terms: "x", offset: 7500 }, { terms: "x", count: 500, offset: 7001 }, { terms: "x", maxList: 10, count: 10 }, { terms: "x", df: "name,billable" }, { terms: "x", version: "2027" }, { terms: "x", q: [] }])("rejects unsupported or unbounded inputs %#", input => {
  expect(() => searchParams(input)).toThrow();
});
it.each([{}, [0, [], null], [1, ["A00"], null, []], [1, ["A00"], { code: [] }, [["A00"]]], [1, ["A00"], null, [["A00"]], []]].map(native => ({ native })))("rejects malformed or misaligned responses %#", ({ native }) => {
  expect(() => normalizeNlmResponse(native, searchParams({ terms: "x" }))).toThrow();
});
