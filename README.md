# pdfdancer-mcp

A Model Context Protocol (MCP) server providing coding agents with searchable access to official PDFDancer SDK documentation. This server enables AI coding assistants to discover and retrieve comprehensive documentation for building PDF manipulation applications using PDFDancer SDKs for Python, TypeScript, and Java.

Once published to npm it can be invoked directly via:

```bash
npx -y @pdfdancer/pdfdancer-mcp
```

## Development

```bash
npm install
npm run dev   # starts the server via tsx for quick iteration
npm run build # emits ESM output to dist/
npm run lint  # type-check without emitting files
```

## Publishing to npm

The package is configured to automatically build and lint before publishing:

```bash
# Login to npm (first time only)
npm login

# Publish to npm (prepublishOnly script runs automatically)
npm run publish:npm
```

Or use the standard npm publish command:
```bash
npm publish
```

The `prepublishOnly` script ensures the package is linted and built before each publish.

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

Set `PDFDANCER_DOCS_BASE_URL` to point to your PDFDancer documentation service endpoint if different from the default. The server defaults to the official PDFDancer documentation service.

Example:

```bash
export PDFDANCER_DOCS_BASE_URL=https://your-docs-endpoint.com
npx -y . # or npm run dev
```

## Available Tools

The MCP server provides the following tools for accessing PDFDancer documentation:

- **`help`** – Display comprehensive overview of PDFDancer SDK capabilities with multi-language code samples (TypeScript, Python, Java) demonstrating common PDF manipulation tasks.

- **`search-docs`** – Search the official PDFDancer SDK documentation by keyword. Returns matching documentation routes with titles, content snippets, and relevance scores. Use this to find information about PDFDancer features, APIs, and usage examples.

- **`get-docs`** – Retrieve the full documentation content for a specific route. After finding relevant documentation with `search-docs`, use this tool to get the complete markdown content including code examples, detailed explanations, and API references.

- **`list-indexes`** – List all available PDFDancer documentation indexes and tags. Use this to discover which SDK versions, languages, or documentation categories are available for searching.

- **`list-routes`** – List all available PDFDancer documentation routes. Use this to browse all documentation pages, articles, and guides available for retrieval.

## Typical Workflow

1. **Search for relevant topics**: Use `search-docs` with keywords like "authentication", "edit text", "add paragraph", or "forms"
2. **Get detailed documentation**: Use `get-docs` with a route from the search results to retrieve complete documentation
3. **Review code samples**: Use `help` to see working examples in TypeScript, Python, or Java
4. **Implement your solution**: Apply the patterns from the documentation to build your PDF manipulation features

Each tool returns both human-readable formatted output and structured content for easy integration into coding workflows.
