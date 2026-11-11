import { NLM_SOURCE_PAGE, parseSourceVersion, unknownVersion, type SourceVersion } from "./source-version";

export function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
export async function boundedText(response: Response): Promise<string> {
  if (!response.ok) { void response.body?.cancel().catch(() => {}); fail(`NLM HTTP ${response.status}`, response.status); } // Best-effort cleanup.
  const reader = response.body?.getReader(); if (!reader) fail("Empty NLM response", 502);
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  const chunks: string[] = []; let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength; if (bytes > 4 * 1024 * 1024) fail("NLM response exceeds 4 MiB", 502);
      chunks.push(decoder.decode(chunk.value, { stream: true }));
    }
    chunks.push(decoder.decode()); return chunks.join("");
  } finally { void reader.cancel().catch(() => {}); } // Best-effort cleanup.
}
async function read(path: string, params: Record<string, unknown> = {}): Promise<string> {
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("NLM read exceeded 30 seconds")); }, 30000);
  });
  try {
    const url = new URL(path, NLM_SOURCE_PAGE);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = fetch(url, { signal: controller.signal, redirect: "manual", headers: { Accept: path === "/" ? "text/html" : "application/json" } }).then(boundedText);
    return await Promise.race([response, deadline]);
  } finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); }
}
export async function readSearch(params: Record<string, unknown>): Promise<unknown> {
  const text = await read("/api/icd10cm/v3/search", params);
  try { return JSON.parse(text); } catch { fail("NLM returned invalid JSON", 502); }
}
export async function readVersion(): Promise<SourceVersion> {
  try { return await parseSourceVersion(await read("/", {})); }
  catch { return unknownVersion("unavailable", "NLM source metadata unavailable; no source year or service-date validity inferred."); }
}
