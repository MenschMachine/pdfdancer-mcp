#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };

const pkg = packageJson as { version?: string };

async function main() {
  const server = new McpServer({
    name: 'pdfdancer-mcp',
    version: pkg.version ?? '0.0.0',
    description: 'Hello world server from pdfdancer'
  });

  server.registerTool(
    'hello-world',
    {
      title: 'Friendly hello',
      description: 'Returns a pdfdancer-branded greeting',
      inputSchema: {
        name: z.string().optional()
      }
    },
    async ({ name }) => {
      const text = name
        ? `Hello, ${name}! Thanks for trying pdfdancer-mcp.`
        : 'Hello from pdfdancer-mcp! Pass a name to personalize this message.';

      return {
        content: [
          {
            type: 'text',
            text
          }
        ]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error('pdfdancer-mcp server failed:', error);
  process.exitCode = 1;
});
