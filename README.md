# pdfdancer-mcp

A Model Context Protocol (MCP) server providing coding agents with searchable access to official PDFDancer SDK documentation. This server enables AI coding assistants to discover and retrieve comprehensive documentation for building PDF manipulation applications using PDFDancer SDKs for Python, TypeScript, and Java.

## Requirements

- **Node.js** >= v18.0.0
- **MCP Client**: Cursor, Claude Code, VS Code, Windsurf, Zed, or any other MCP-compatible client

## Installation

Add this MCP server to your preferred AI coding assistant. Choose your client below for specific installation instructions.

### Cursor

#### Option 1: One-Click Installation (Recommended)
Click the button below to install pdfdancer-mcp in Cursor:

[![Install in Cursor](https://img.shields.io/badge/Install%20in-Cursor-blue?style=for-the-badge&logo=cursor)](https://cursor.directory/install/pdfdancer-mcp)

#### Option 2: Manual Configuration
1. Open Cursor Settings
2. Navigate to the "MCP" section
3. Add the following configuration:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

### Claude Code

Add the following to your Claude Code MCP settings configuration file:

**Location**: `~/.config/claude/claude_desktop_config.json` (Linux/macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

After adding the configuration, restart Claude Code to activate the MCP server.

### VS Code / VS Code Insiders

When using MCP-compatible extensions in VS Code:

1. Install an MCP client extension (such as Cline, Roo Code, or similar)
2. Open the extension's settings
3. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

### Windsurf

1. Open Windsurf Settings
2. Navigate to the MCP section
3. Add the server configuration:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

### Zed

1. Open Zed settings (`~/.config/zed/settings.json`)
2. Add the following under the `assistant` section:

```json
{
  "assistant": {
    "version": "2",
    "mcp_servers": [
      {
        "id": "pdfdancer-mcp",
        "command": "npx",
        "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
      }
    ]
  }
}
```

### Cline (VS Code Extension)

Cline automatically discovers MCP servers. To add pdfdancer-mcp:

1. Open VS Code with Cline installed
2. Open Cline's MCP Settings
3. Add the server:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

### Augment Code

#### Option 1: UI Configuration
1. Open Augment Code settings
2. Navigate to MCP Servers
3. Click "Add Server"
4. Enter:
   - **Name**: `pdfdancer-mcp`
   - **Command**: `npx`
   - **Args**: `-y @pdfdancer/pdfdancer-mcp`

#### Option 2: Manual Configuration
Edit your Augment Code configuration file:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

### Roo Code

1. Open Roo Code settings
2. Locate the MCP configuration section
3. Add:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

### Other MCP-Compatible Clients

For any other MCP-compatible client, use the following standard configuration:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"]
    }
  }
}
```

Consult your client's documentation for the specific location of the MCP configuration file.

### Custom Documentation Endpoint (Optional)

If you're using a custom PDFDancer documentation endpoint, you can configure it via environment variable:

```json
{
  "mcpServers": {
    "pdfdancer-mcp": {
      "command": "npx",
      "args": ["-y", "@pdfdancer/pdfdancer-mcp"],
      "env": {
        "PDFDANCER_DOCS_BASE_URL": "https://your-docs-endpoint.com"
      }
    }
  }
}
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
