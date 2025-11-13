#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };

const pkg = packageJson as { version?: string };
const rawBaseUrl =
  process.env.DCS_BASE_URL ??
  process.env.DOCUSAURUS_SEARCH_BASE_URL ??
  'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/';

let apiBase: URL;
try {
  apiBase = new URL(rawBaseUrl);
} catch (error) {
  console.error(
    `Invalid Docusaurus search base URL "${rawBaseUrl}". Set DCS_BASE_URL or DOCUSAURUS_SEARCH_BASE_URL to a valid URL.`,
    error
  );
  process.exit(1);
}

type HttpMethod = 'GET' | 'POST';

interface ApiRequestOptions {
  method?: HttpMethod;
  searchParams?: Record<string, string | number | undefined | null>;
  body?: unknown;
}

type JsonObject = Record<string, unknown>;

interface SearchResult extends JsonObject {
  id: number;
  pageTitle?: string;
  sectionTitle?: string | null;
  sectionRoute: string;
  sectionContent?: string;
  type?: string;
  score?: number;
}

interface SearchResponse extends JsonObject {
  results: SearchResult[];
  total: number;
  query: string;
  took: number;
}

interface IndexInfo extends JsonObject {
  tag: string;
  key: string;
  metadata?: Record<string, unknown>;
}

interface IndexListResponse extends JsonObject {
  indexes: IndexInfo[];
}

interface ContentListResponse extends JsonObject {
  files: Array<{
    route: string;
    size?: number;
    updatedAt?: string;
  }>;
  total: number;
}

interface ContentResponse extends JsonObject {
  route: string;
  content: string;
  metadata?: Record<string, unknown>;
}

async function callApi<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = new URL(path, apiBase);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const method = options.method ?? 'GET';
  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    }
  };

  if (options.body && method === 'POST') {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Request to ${url.toString()} failed with status ${response.status}: ${
        text || response.statusText
      }`
    );
  }

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url.toString()}: ${error}`);
  }
}

function formatJsonBlock(title: string, payload: unknown): string {
  return `${title}\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

function summarizeSearchResponse(data: SearchResponse): string {
  if (!data.results?.length) {
    return `No matches for "${data.query}".`;
  }

  const lines = data.results.slice(0, 5).map((result, index) => {
    const title = result.pageTitle ?? result.sectionTitle ?? result.sectionRoute;
    const score = typeof result.score === 'number' ? `score=${result.score.toFixed(3)}` : '';
    return `${index + 1}. ${title} → ${result.sectionRoute} ${score}`.trim();
  });

  const summary = `${data.total} result(s) for "${data.query}" (showing ${lines.length}, ${data.took}ms).`;
  return `${summary}\n${lines.join('\n')}`;
}

async function main() {
  const server = new McpServer({
    name: 'pdfdancer-mcp',
    version: pkg.version ?? '0.0.0',
    description: 'MCP helpers for Docusaurus Cloudflare Search endpoints'
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

  server.registerTool(
    'dcs-api-info',
    {
      title: 'Get API metadata',
      description: `Calls GET ${apiBase.origin}/ to retrieve the worker's overview.`,
      inputSchema: {}
    },
    async () => {
      const data = await callApi<Record<string, unknown>>('/');
      return {
        content: [
          {
            type: 'text',
            text: formatJsonBlock('API info', data)
          }
        ],
        structuredContent: data
      };
    }
  );

  server.registerTool(
    'dcs-search',
    {
      title: 'Search documentation',
      description: 'Executes a search query via GET or POST /search.',
      inputSchema: {
        query: z.string().min(1, 'query is required'),
        tag: z.string().optional(),
        maxResults: z.number().int().min(1).max(100).optional(),
        method: z.enum(['get', 'post']).default('get')
      }
    },
    async ({ query, tag, maxResults, method }) => {
      const usePost = method === 'post';
      const payload = { query, tag, maxResults };
      const data = usePost
        ? await callApi<SearchResponse>('/search', {
            method: 'POST',
            body: payload
          })
        : await callApi<SearchResponse>('/search', {
            searchParams: {
              q: query,
              tag,
              maxResults
            }
          });

      return {
        content: [
          {
            type: 'text',
            text: `${summarizeSearchResponse(data)}\n\n${formatJsonBlock('Raw search response', data)}`
          }
        ],
        structuredContent: data
      };
    }
  );

  server.registerTool(
    'dcs-list-indexes',
    {
      title: 'List available indexes',
      description: 'Calls GET /indexes to enumerate search index tags.',
      inputSchema: {}
    },
    async () => {
      const data = await callApi<IndexListResponse>('/indexes');
      return {
        content: [
          {
            type: 'text',
            text: formatJsonBlock('Indexes', data)
          }
        ],
        structuredContent: data
      };
    }
  );

  server.registerTool(
    'dcs-list-content',
    {
      title: 'List stored content files',
      description: 'Calls GET /list-content to show cached markdown routes available in KV.',
      inputSchema: {}
    },
    async () => {
      const data = await callApi<ContentListResponse>('/list-content');
      return {
        content: [
          {
            type: 'text',
            text: formatJsonBlock('Content files', data)
          }
        ],
        structuredContent: data
      };
    }
  );

  server.registerTool(
    'dcs-get-content',
    {
      title: 'Retrieve markdown content',
      description: 'Calls GET /content?route=/path to fetch the stored markdown for a route.',
      inputSchema: {
        route: z.string().regex(/^\/.*/, 'route must start with /')
      }
    },
    async ({ route }) => {
      const data = await callApi<ContentResponse>('/content', {
        searchParams: {
          route
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: formatJsonBlock(`Content for ${route}`, data)
          },
          {
            type: 'text',
            text: data.content
          }
        ],
        structuredContent: data
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
