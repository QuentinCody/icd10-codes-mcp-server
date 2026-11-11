# ICD-10 Codes MCP Server

This is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. It lets MCP clients (Claude Desktop, Claude Code, Continue, etc.) query the upstream ICD-10 Codes API in natural language. It is one of 100+ servers in the [Bio MCP](../../README.md) monorepo.

## Connect

The server is deployed and ready at:

```
https://icd10-codes-mcp-server.quentincody.workers.dev/mcp
```

Add it to your MCP client (Claude Desktop → Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "icd10-codes": {
      "command": "npx",
      "args": ["mcp-remote", "https://icd10-codes-mcp-server.quentincody.workers.dev/mcp"]
    }
  }
}
```

For local development the server runs at `http://localhost:8871/mcp` (start it with `./scripts/dev-servers.sh icd10-codes`):

```json
{
  "mcpServers": {
    "icd10-codes-local": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8871/mcp"]
    }
  }
}
```

## Tools

- `icd10_search` — discover available API operations (Code Mode catalog search, 2 entries)
- `icd10_execute` — **Code Mode**: write JavaScript in a V8 isolate (`api.get()` / `api.post()` / `searchSpec()`) instead of issuing tool calls one by one
- `icd10_query_data` — run SQL over large responses auto-staged into a per-session SQLite database
- `icd10_get_schema` — inspect the inferred schema of a staged dataset

Large responses (>30KB) are auto-staged into a queryable SQLite database; the tools return a `data_access_id` you can query with SQL.

Every tool returns both a human-readable `content` summary and a structured `structuredContent` payload.

## Source year and effective dates

`GET /icd10cm/source` is a local helper that reads the ICD-10-CM row of the [NLM source catalog](https://clinicaltables.nlm.nih.gov/). It returns the advertised version label, code-set year where unambiguous, record count, retrieval time, and a hash of the observed page. Missing, ambiguous, or unavailable metadata remains explicit; it never falls back to the calendar year.

`GET /icd10cm/search` retains the existing `total` and `codes` fields and now also returns the full native NLM arrays plus `_icd10` source/paging context. The native path `/api/icd10cm/v3/search` remains supported. `expected_source_version` optionally rejects a missing or changed source-page label. The catalog includes an executable discovery/search example.

NLM advertised data version **2026** when reviewed September 29, 2026. This is a dated documentation observation, not a hard-coded runtime release. The compact search response does not identify its release, and the year alone cannot distinguish intra-year revisions. `effective_start` and `effective_end` remain unknown; no service-date eligibility or billability is inferred. API `v3` is a protocol version, not a code-set year. A matching homepage label does not provide an atomic snapshot or historical release selection.

The [CDC release page](https://www.cdc.gov/nchs/icd/icd-10-cm/files.html) separately lists the FY2027 release for services beginning October 1, 2026. A future published release must not be substituted for the dataset served by NLM or treated as already effective for an earlier encounter.

Use `count`/`offset` for paging, or `maxList` for autocomplete. The adapter defaults to up to 500 results, preserves extra-field aliases and display ordering, and enforces NLM's 7,500-result retrieval window. Reported totals may be approximate and are capped at 10,000; a page does not establish completeness. See [NLM's API contract](https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html). Invalid responses raise errors instead of becoming empty results. All four tools also have `mcp_icd10_*` aliases, and source/native context travels through staging.

Local tests cover source parsing, future/ambiguous labels, native arrays, metadata failures, paging, recipes, aliases and transport limits. Real homepage HTML parsing, live search, and deployed MCP/staged SQL acceptance remain pending: shell DNS was unavailable and the MCP probe required approval unavailable in this session.

## Development

```bash
./scripts/dev-servers.sh icd10-codes            # run locally (port 8871)
pnpm --filter icd10-codes-mcp-server run deploy   # deploy to Cloudflare Workers
```

See [`docs/adding-mcp-servers.md`](../../docs/adding-mcp-servers.md) and the root [README](../../README.md) for the full architecture (Code Mode, staging, portals).

---

*Auto-generated baseline README — refine with server-specific detail as needed.*

<!-- license-and-data-terms:start -->
## License and data terms

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`).
If you use it in your work, please cite it (see `CITATION.cff`). Citation is requested, not required.

The license covers the code only. Data that this server returns comes from ICD-10-CM (NLM Clinical Tables) and stays under the terms of that source: US public domain.
You are responsible for your use of the data under those terms.
<!-- license-and-data-terms:end -->
