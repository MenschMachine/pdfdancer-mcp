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

interface HelpDocument extends JsonObject {
  title: string;
  overview: string;
  sections: Array<{
    heading: string;
    items: string[];
  }>;
  codeSamples: Array<{
    language: string;
    syntax: string;
    path: string;
    description: string;
    snippet: string;
  }>;
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

const helpDocument: HelpDocument = {
  title: 'PDFDancer MCP helper',
  overview:
    'This MCP server gives coding agents high-fidelity access to PDFDancer documentation, SDK clients, and the Docusaurus Cloudflare Search worker so they can implement pdfdancer-based features end-to-end.',
  sections: [
    {
      heading: 'Core documentation surfaces',
      items: [
        '- `/Users/michael/Code/TFC/pdfdancer/pdfdancer-api-docs`: Official Docusaurus site that unifies Java, Python, and TypeScript docs. Run `npm install && npm start` to browse locally (content in `docs/`, SDK submodules in `external/`).',
        '- `/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-typescript/_main`: TypeScript SDK source + README with install, retry config, and selectors. Examples live in `/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-typescript-examples`.',
        '- `/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-python/_main`: Python SDK with virtualenv-ready README. Extra runnable snippets sit in `/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-python-examples`.',
        '- `/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-java`: Java SDK (Gradle) and `/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-java-examples` for CLI-ready samples.'
      ]
    },
    {
      heading: 'Using this MCP server',
      items: [
        '- Set `DCS_BASE_URL` (defaults to `http://localhost:8787`) so the `dcs-*` tools hit your Cloudflare Worker or local `wrangler dev` instance.',
        '- Keep `PDFDANCER_TOKEN` and optional `PDFDANCER_BASE_URL` available when running the SDK snippets below.',
        '- Tools: `hello-world`, `help`, `dcs-api-info`, `dcs-search`, `dcs-list-indexes`, `dcs-list-content`, `dcs-get-content`.',
        '- Call `npx -y .` (after `npm run build`) to expose these tools to clients like Claude Desktop.'
      ]
    },
    {
      heading: 'Typical workflow for coding agents',
      items: [
        '1. Consult the API docs (via this help text or the Docusaurus site) to confirm object models and required auth.',
        '2. Use the language-specific client README + examples to scaffold code (samples below).',
        '3. Exercise the worker endpoints with `dcs-search` etc. to verify the documentation index for your project is populated.',
        '4. Implant validated snippets back into your feature branch, keeping env vars and retry/backoff guidance aligned with the SDK defaults.'
      ]
    }
  ],
  codeSamples: [
    {
      language: 'TypeScript',
      syntax: 'ts',
      path: '/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-typescript/_main/README.md',
      description: 'Open an existing PDF, reposition text, add a paragraph, and save.',
      snippet: `import { PDFDancer, Color, StandardFonts } from 'pdfdancer-client-typescript';
import { promises as fs } from 'node:fs';

async function run() {
  const pdfBytes = await fs.readFile('input.pdf');
  const pdf = await PDFDancer.open(pdfBytes); // token/base URL auto-read from env

  const heading = (await pdf.page(0).selectParagraphsStartingWith('Executive Summary'))[0];
  await heading.moveTo(72, 680);
  await heading.edit().replace('Overview').apply();

  await pdf.page(0).newParagraph()
    .text('Generated with PDFDancer')
    .font(StandardFonts.HELVETICA, 12)
    .color(new Color(70, 70, 70))
    .at(72, 520)
    .apply();

  await pdf.save('output.pdf');
}

run().catch(console.error);`
    },
    {
      language: 'Python',
      syntax: 'python',
      path: '/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-python/_main/README.md',
      description: 'Context-managed session that edits an existing document and appends content.',
      snippet: `from pathlib import Path
from pdfdancer import Color, PDFDancer, StandardFonts

with PDFDancer.open(Path("input.pdf")) as pdf:
    heading = pdf.page(0).select_paragraphs_starting_with("Executive Summary")[0]
    heading.move_to(72, 680)
    with heading.edit() as editor:
        editor.replace("Overview")

    pdf.new_paragraph() \\
        .text("Generated with PDFDancer") \\
        .font(StandardFonts.HELVETICA, 12) \\
        .color(Color(70, 70, 70)) \\
        .line_spacing(1.4) \\
        .at(page_index=0, x=72, y=520) \\
        .add()

    pdf.save("output.pdf")`
    },
    {
      language: 'Java',
      syntax: 'java',
      path: '/Users/michael/Code/TFC/pdfdancer/pdfdancer-client-java/README.md',
      description: 'Gradle/Maven friendly snippet that creates a session, edits paragraphs, and saves.',
      snippet: `import com.pdfdancer.client.rest.PDFDancer;
import com.pdfdancer.client.rest.TextParagraphReference;
import com.pdfdancer.common.model.Color;
import com.pdfdancer.common.util.StandardFonts;

public class EditPdfExample {
    public static void main(String[] args) throws Exception {
        PDFDancer pdf = PDFDancer.createSession("input.pdf"); // token pulled from env

        TextParagraphReference heading = pdf.page(0)
            .selectParagraphsStartingWith("Executive Summary")
            .get(0);

        heading.moveTo(72, 680);
        heading.edit()
            .replace("Overview")
            .font(StandardFonts.HELVETICA.getFontName(), 14)
            .lineSpacing(1.3)
            .color(new Color(40, 40, 40))
            .apply();

        pdf.newParagraph()
            .text("Generated with PDFDancer")
            .font(StandardFonts.HELVETICA.getFontName(), 12)
            .color(new Color(70, 70, 70))
            .at(0, 72, 520)
            .add();

        pdf.save("output.pdf");
    }
}`
    }
  ]
};

function renderHelpDocument(doc: HelpDocument): string {
  const sections = doc.sections
    .map(section => `### ${section.heading}\n${section.items.join('\n')}`)
    .join('\n\n');

  const samples = doc.codeSamples
    .map(sample => {
      return `### ${sample.language} sample (${sample.path})\n${sample.description}\n\`\`\`${sample.syntax}\n${sample.snippet}\n\`\`\``;
    })
    .join('\n\n');

  return `# ${doc.title}\n\n${doc.overview}\n\n${sections}\n\n## SDK code samples\n\n${samples}`.trim();
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
    'help',
    {
      title: 'PDFDancer MCP help',
      description: 'Explains the purpose of this server, key docs, and provides multi-language code samples.',
      inputSchema: {}
    },
    async () => {
      const text = renderHelpDocument(helpDocument);
      return {
        content: [
          {
            type: 'text',
            text
          }
        ],
        structuredContent: helpDocument
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
