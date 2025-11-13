# pdfdancer-mcp

A tiny Model Context Protocol (MCP) server written in TypeScript that exposes a single `hello-world` tool over stdio. Once published to npm it can be invoked directly via:

```bash
npx -y @pdfdancer/pdfdancer-mcp
```

## Development

```bash
npm install
npm run dev   # starts the server via tsx for quick iteration
npm run build # emits ESM output to dist/
```

`npm run build` must be executed before publishing so that the `dist/` artifacts shipped to npm include the compiled CLI entry point referenced by the package `bin` field.

## Local testing

1. Build the distributable files so the CLI matches the eventual npm artifact:
   ```bash
   npm run build
   ```
2. Launch the stdio server exactly as `npx` would, but pointing to the local package directory:
   ```bash
   npx -y .
   ```
3. Alternatively, run the compiled output directly with Node:
   ```bash
   node dist/index.js
   ```
4. For the fastest inner loop while editing TypeScript, use:
   ```bash
   npm run dev
   ```
Any MCP-compatible client (Claude Desktop, MCP CLI, etc.) can now connect to the running process over stdio.

## Configuration

Set `DCS_BASE_URL` (or `DOCUSAURUS_SEARCH_BASE_URL`) to point at the running Cloudflare Worker or local dev server. It defaults to `http://localhost:8787`, which matches the worker dev server started via `npx wrangler dev` inside the `tools/docusaurus-cloudflare-search` project.

Example:

```bash
export DCS_BASE_URL=https://your-worker.workers.dev
npx -y . # or npm run dev
```

## Tooling surface

The MCP server now exposes:

- `hello-world` – simple greeting used to verify connectivity.
- `help` – curated overview of pdfdancer docs plus Java/TS/Python sample code.
- `dcs-api-info` – `GET /` for high-level worker metadata.
- `dcs-search` – `GET`/`POST /search` with `query`, optional `tag`, `maxResults`, and selectable method.
- `dcs-list-indexes` – `GET /indexes` to enumerate search index tags stored in KV.
- `dcs-list-content` – `GET /list-content` to inspect available cached markdown files.
- `dcs-get-content` – `GET /content?route=/docs/...` to retrieve the stored markdown (frontmatter + body) for a specific route.

Each tool returns both a human-readable summary and the raw JSON payload as structured content, making it easy to inspect or chain into other workflows.
