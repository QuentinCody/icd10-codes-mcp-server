import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { icd10Fetch } from "./http";

/**
 * Normalize NLM Clinical Tables array response into structured JSON.
 *
 * NLM response format: [totalCount, codeArray, extraFieldsObj, displayFieldsArray]
 * Example: [87, ["E11.00","E11.01"], {"code":["E11.00","E11.01"],"name":["desc1","desc2"]}, [["E11.00","desc1"],["E11.01","desc2"]]]
 *
 * We transform this into: { total: 87, codes: [{ code: "E11.00", name: "desc1" }, ...] }
 */
function normalizeNlmResponse(raw: unknown): { total: number; codes: Array<{ code: string; name: string }> } {
    if (!Array.isArray(raw) || raw.length < 3) {
        return { total: 0, codes: [] };
    }

    const total = typeof raw[0] === "number" ? raw[0] : 0;
    const extras = raw[2] as { code?: string[]; name?: string[] } | null;

    if (!extras || !extras.code || !extras.name) {
        // Fallback to display fields (index 3) if extra fields missing
        const display = raw[3] as string[][] | undefined;
        if (display && Array.isArray(display)) {
            const codes = display.map((pair) => ({
                code: pair[0] || "",
                name: pair[1] || "",
            }));
            return { total, codes };
        }
        return { total, codes: [] };
    }

    const codes = extras.code.map((c, i) => ({
        code: c,
        name: extras.name?.[i] || "",
    }));

    return { total, codes };
}

export function createIcd10ApiFetch(): ApiFetchFn {
    return async (request) => {
        let path = request.path;
        const params: Record<string, unknown> = { ...request.params };

        // Map virtual paths to real NLM API paths
        if (path === "/icd10cm/search" || path.startsWith("/icd10cm/search?")) {
            path = "/api/icd10cm/v3/search";
        }

        // Apply defaults for comprehensive results
        if (!params.sf) params.sf = "code,name";
        if (!params.df) params.df = "code,name";
        if (!params.ef) params.ef = "code,name";
        if (!params.maxList) params.maxList = 500;

        const response = await icd10Fetch(path, params);

        if (!response.ok) {
            let errorBody: string;
            try {
                errorBody = await response.text();
            } catch {
                errorBody = response.statusText;
            }
            const error = new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`) as Error & {
                status: number;
                data: unknown;
            };
            error.status = response.status;
            error.data = errorBody;
            throw error;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
            const text = await response.text();
            return { status: response.status, data: text };
        }

        const raw = await response.json();

        // Normalize the NLM array response into structured objects
        const data = normalizeNlmResponse(raw);
        return { status: response.status, data };
    };
}
