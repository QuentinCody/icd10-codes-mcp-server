import { restFetch } from "@bio-mcp/shared/http/rest-fetch";
import type { RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const NLM_BASE = "https://clinicaltables.nlm.nih.gov";

export interface Icd10FetchOptions extends Omit<RestFetchOptions, "retryOn"> {
    baseUrl?: string;
}

/**
 * Fetch from the NLM Clinical Tables API (ICD-10-CM).
 */
export async function icd10Fetch(
    path: string,
    params?: Record<string, unknown>,
    opts?: Icd10FetchOptions,
): Promise<Response> {
    const baseUrl = opts?.baseUrl ?? NLM_BASE;
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(opts?.headers ?? {}),
    };

    return restFetch(baseUrl, path, params, {
        ...opts,
        headers,
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent: "icd10-codes-mcp-server/1.0 (bio-mcp)",
    });
}
