import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const icd10Catalog: ApiCatalog = {
    name: "ICD-10-CM Codes (NLM Clinical Tables)",
    baseUrl: "https://clinicaltables.nlm.nih.gov",
    version: "v3",
    auth: "none",
    endpointCount: 2,
    notes:
        "- ICD-10-CM (International Classification of Diseases, 10th Revision, Clinical Modification) is the US standard for diagnosis coding\n" +
        "- Source: NLM Clinical Table Search Service backed by CDC ICD-10-CM. API v3 is not a code-set year. Use /icd10cm/source for observed source metadata.\n" +
        "- The raw NLM API returns arrays: [totalCount, codeArray, extraFieldsObj, displayFieldsArray]\n" +
        "- Results retain { total, codes: [{code,name}], native, _icd10 }. Native extra/display/code-system arrays are not discarded.\n" +
        "- _icd10.source observes the NLM homepage version/year, not a release certified by each response. Exact revision/effective dates remain unknown; consult CDC for the service date.\n" +
        "- expected_source_version checks the observed homepage label; it does not select a historical release or guarantee atomic pagination. Metadata failure is explicit and does not become a guessed current year.\n" +
        "- Reported total may be approximate and is capped at 10,000. A bounded page is not proof of exhaustive coverage.\n" +
        "- Two searchable fields: code and name. sf=code,name searches both by default\n" +
        "- ICD-10-CM codes: alphanumeric, 3-7 chars. First char is letter (A-Z), second is digit\n" +
        "- Code length alone does not establish billability, completeness, or eligibility for a service date.\n" +
        "- Search by code prefix: terms=E11 finds matching Type 2 diabetes codes within the requested page\n" +
        "- Search by description: terms=diabetes finds matching descriptions within the requested page\n" +
        "- maxList controls result count (default 500, max 500). Use count+offset for pagination beyond 500\n" +
        "- Pagination: count (page size, max 500) + offset (0-based start). Total retrievable: 7,500\n" +
        "- q parameter: Elasticsearch query string for advanced filtering (supports wildcards, field names)\n" +
        "- Common code ranges: A00-B99 (infectious), C00-D49 (neoplasms), E00-E89 (endocrine),\n" +
        "  F01-F99 (mental), G00-G99 (nervous system), I00-I99 (circulatory), J00-J99 (respiratory),\n" +
        "  K00-K95 (digestive), M00-M99 (musculoskeletal), N00-N99 (genitourinary), R00-R99 (symptoms),\n" +
        "  S00-T88 (injury), Z00-Z99 (factors influencing health status)",
    endpoints: [
        {
            method: "GET", path: "/icd10cm/source", category: "provenance",
            summary: "Observe NLM's advertised ICD-10-CM version/year and record count, with homepage hash and retrieval time; unknown values stay explicit",
        },
        {
            method: "GET",
            path: "/icd10cm/search",
            summary: "Search ICD-10-CM diagnosis codes by code prefix or description keyword",
            category: "diagnosis",
            queryParams: [
                { name: "expected_source_version", type: "string", required: false, description: "Require this exact observed NLM homepage version label; reject missing/changed metadata. Does not pin the API data release." },
                {
                    name: "terms",
                    type: "string",
                    required: true,
                    description:
                        "Search string — code prefix (e.g., E11, C92.1) or description keywords (e.g., diabetes, lung cancer). Multiple words are ANDed together.",
                },
                {
                    name: "maxList",
                    type: "number",
                    required: false,
                    description: "Max results to return (default 500, max 500). For more, use count+offset pagination.",
                },
                {
                    name: "sf",
                    type: "string",
                    required: false,
                    description: "Search fields, comma-separated (default: code,name). Options: code, name.",
                },
                {
                    name: "count",
                    type: "number",
                    required: false,
                    description: "Page size for pagination (max 500). Use with offset.",
                },
                {
                    name: "offset",
                    type: "number",
                    required: false,
                    description: "Starting result index (0-based) for pagination. Max offset+count = 7,500.",
                },
                {
                    name: "q",
                    type: "string",
                    required: false,
                    description:
                        "Elasticsearch query string for advanced filtering. Supports wildcards and field:value syntax. Not auto-wildcarded like terms.",
                },
                { name: "df", type: "string", required: false, description: "Display fields code/name, comma-separated; default code,name. Native order retained." },
                { name: "ef", type: "string", required: false, description: "Extra fields code/name, optional field:alias syntax; default code,name. Native values retained." },
                { name: "cf", type: "string", required: false, description: "Native code-array field, code or name; default code." },
            ],
        },
    ],
    workflows: [{
        title: "Search with observed source-version context",
        keywords: ["source", "year", "version", "ICD-10-CM", "provenance"],
        description: "Read the NLM source label, then request a bounded page with a metadata drift check. Effective dates and exact source revision remain unverified.",
        code: `const source = await api.get("/icd10cm/source");
if (source.__staged) return source;
if (!source.source_version_label) return source;
return await api.get("/icd10cm/search", {terms:"diabetes", count:25, offset:0, expected_source_version:source.source_version_label});`,
    }],
};
