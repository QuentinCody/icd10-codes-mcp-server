import { expect, it } from "vitest";
import { parseSourceVersion } from "./source-version";

const row = (label = "2026", count = "74,719") => `<tr><td><a href="/apidoc/icd10cm/v3/doc.html">ICD-10-CM</a></td><td>From CDC Data version: <b>${label}</b>; ${count} records</td></tr>`;
it("extracts only the ICD-10 source row without confusing other datasets or site dates", async () => {
  const html = `<table><tr><td>ICD-11 Data version: 2027; 100 records</td></tr>${row()}<tr><td>HCPCS Data version: July 2026; 8893 records</td></tr></table><footer>Last updated: 2026-09-25</footer>`;
  expect(await parseSourceVersion(html)).toMatchObject({ source_version_label: "2026", source_code_set_year: 2026, source_record_count: 74719,
    effective_start: null, effective_end: null, response_release_verified: false, page_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
});
it("does not turn a future edition into an effective coding date", async () => {
  expect(await parseSourceVersion(row("2027"))).toMatchObject({ source_code_set_year: 2027, effective_start: null, effective_end: null });
});
it("preserves an intra-year release label without manufacturing dates", async () => {
  expect(await parseSourceVersion(row("FY 2026 (April update)"))).toMatchObject({ source_version_label: "FY 2026 (April update)", source_code_set_year: 2026, effective_start: null });
});
it.each(["<html>unavailable</html>", row() + row("2027"), row().replace("Data version", "Version unknown"), '<tr><td>Data version: 2026; 74719 records</td></tr>'])("reports an unrecognized source instead of guessing %#", async html => {
  expect(await parseSourceVersion(html)).toMatchObject({ observation_status: "unrecognized", source_code_set_year: null, source_version_label: null });
});
it("keeps ambiguous years textual and hashes the observed page", async () => {
  const a = await parseSourceVersion(row("2026/2027")); const b = await parseSourceVersion(row("2026/2027") + " ");
  expect(a.source_code_set_year).toBeNull(); expect(a.source_version_label).toBe("2026/2027"); expect(a.page_sha256).not.toBe(b.page_sha256);
});
