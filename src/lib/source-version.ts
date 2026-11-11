export const NLM_SOURCE_PAGE = "https://clinicaltables.nlm.nih.gov/";
export const CDC_RELEASE_PAGE = "https://www.cdc.gov/nchs/icd/icd-10-cm/files.html";

export interface SourceVersion {
  source_url: string;
  observed_at: string;
  source_version_label: string | null;
  source_code_set_year: number | null;
  source_record_count: number | null;
  observation_status: "observed" | "unavailable" | "unrecognized";
  evidence: string | null;
  page_sha256: string | null;
  response_release_verified: false;
  effective_start: null;
  effective_end: null;
  effective_date_reference: string;
  note: string;
}
export function unknownVersion(status: SourceVersion["observation_status"], note: string): SourceVersion {
  return { source_url: NLM_SOURCE_PAGE, observed_at: new Date().toISOString(),
    source_version_label: null, source_code_set_year: null, source_record_count: null,
    observation_status: status, evidence: null, page_sha256: null, response_release_verified: false,
    effective_start: null, effective_end: null, effective_date_reference: CDC_RELEASE_PAGE, note };
}
function plain(text: string): string {
  return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}
export async function parseSourceVersion(html: string): Promise<SourceVersion> {
  const rows = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)]
    .map(match => match[0]).filter(row => /(?:\/apidoc\/icd10cm\/|\/api\/icd10cm\/)/i.test(row));
  const observations = rows.map(plain).map(row => /Data version:\s*([^;]+);\s*([\d,]+)\s+records/i.exec(row)).filter(match => match !== null);
  const result = unknownVersion("unrecognized", "NLM source version could not be identified unambiguously; no year or effective date inferred.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html));
  result.page_sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (rows.length !== 1 || observations.length !== 1) return result;
  const observation = observations[0];
  const label = observation[1].trim();
  if (!label || label.length > 200) return result;
  const years = [...new Set(label.match(/\b(?:19|20)\d{2}\b/g) ?? [])];
  const count = Number(observation[2].replace(/,/g, ""));
  return { ...result, source_version_label: label, source_code_set_year: years.length === 1 ? Number(years[0]) : null,
    source_record_count: Number.isSafeInteger(count) ? count : null, observation_status: "observed",
    evidence: observation[0], note: "Observed NLM homepage metadata, not a release identifier in the search response. A year does not identify an intra-year revision or establish validity for a service date. API v3 is a protocol version; no historical release is selected." };
}
