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

## Tooling surface

The server currently registers a single tool named `hello-world`. It accepts an optional `name` string and responds with a short greeting message, which makes it a minimal but functional MCP target for experimenting with pdfdancer.
