import { afterEach, expect, it, vi } from "vitest";
import { readSearch, readVersion } from "./read";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("encodes search operators as values on the fixed NLM endpoint", async () => {
  const fetcher = vi.fn(async (_url: URL, _init: RequestInit) => Response.json([0, [], null, []])); vi.stubGlobal("fetch", fetcher);
  await readSearch({ terms: 'A&B#x', q: 'code:"A00"' });
  const [url, init] = fetcher.mock.calls[0]; expect(url.origin).toBe("https://clinicaltables.nlm.nih.gov"); expect(url.pathname).toBe("/api/icd10cm/v3/search");
  expect(url.searchParams.get("terms")).toBe("A&B#x"); expect(url.hash).toBe(""); expect(init.redirect).toBe("manual");
});
it.each([404, 429, 503])("keeps HTTP %i as a failure rather than zero results", async status => {
  vi.stubGlobal("fetch", async () => new Response("unavailable", { status })); await expect(readSearch({ terms: "x" })).rejects.toThrow(`HTTP ${status}`);
});
it("returns unknown source metadata when the page is unavailable", async () => {
  vi.stubGlobal("fetch", async () => new Response("unavailable", { status: 503 }));
  expect(await readVersion()).toMatchObject({ observation_status: "unavailable", source_code_set_year: null, response_release_verified: false });
});
it("rejects HTML search responses and oversized UTF-8 data", async () => {
  vi.stubGlobal("fetch", async () => new Response("<html>error</html>")); await expect(readSearch({ terms: "x" })).rejects.toThrow("JSON");
  vi.stubGlobal("fetch", async () => Response.json("α".repeat(3 * 1024 * 1024))); await expect(readSearch({ terms: "x" })).rejects.toThrow("4 MiB");
});
it("bounds body-read stalls", async () => {
  vi.useFakeTimers(); vi.stubGlobal("fetch", async () => new Response(new ReadableStream()));
  const result = expect(readSearch({ terms: "x" })).rejects.toThrow("30 seconds"); await vi.advanceTimersByTimeAsync(30000); await result;
});
