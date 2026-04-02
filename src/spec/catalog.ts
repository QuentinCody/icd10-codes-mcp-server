import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const icd10Catalog: ApiCatalog = {
    name: "ICD-10-CM Codes (NLM Clinical Tables)",
    baseUrl: "https://clinicaltables.nlm.nih.gov",
    version: "2026",
    auth: "none",
    endpointCount: 1,
    notes:
        "- ICD-10-CM (International Classification of Diseases, 10th Revision, Clinical Modification) is the US standard for diagnosis coding\n" +
        "- Source: NLM Clinical Table Search Service backed by CDC ICD-10-CM code set (2026 edition)\n" +
        "- The raw NLM API returns arrays: [totalCount, codeArray, extraFieldsObj, displayFieldsArray]\n" +
        "- The api-adapter normalizes this into: { total: number, codes: [{ code, name }] }\n" +
        "- Two searchable fields: code and name. sf=code,name searches both by default\n" +
        "- ICD-10-CM codes: alphanumeric, 3-7 chars. First char is letter (A-Z), second is digit\n" +
        "- Category codes are 3 chars (e.g., E11), billable codes are 4-7 chars (e.g., E11.65)\n" +
        "- Search by code prefix: terms=E11 finds all Type 2 diabetes codes\n" +
        "- Search by description: terms=diabetes finds all codes mentioning diabetes\n" +
        "- maxList controls result count (default 500, max 500). Use count+offset for pagination beyond 500\n" +
        "- Pagination: count (page size, max 500) + offset (0-based start). Total retrievable: 7,500\n" +
        "- q parameter: Elasticsearch query string for advanced filtering (supports wildcards, field names)\n" +
        "- Common code ranges: A00-B99 (infectious), C00-D49 (neoplasms), E00-E89 (endocrine),\n" +
        "  F01-F99 (mental), G00-G99 (nervous system), I00-I99 (circulatory), J00-J99 (respiratory),\n" +
        "  K00-K95 (digestive), M00-M99 (musculoskeletal), N00-N99 (genitourinary), R00-R99 (symptoms),\n" +
        "  S00-T88 (injury), Z00-Z99 (factors influencing health status)",
    endpoints: [
        {
            method: "GET",
            path: "/icd10cm/search",
            summary: "Search ICD-10-CM diagnosis codes by code prefix or description keyword",
            category: "diagnosis",
            queryParams: [
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
            ],
        },
    ],
};
