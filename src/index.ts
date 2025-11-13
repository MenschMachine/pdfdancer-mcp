#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };

const pkg = packageJson as { version?: string };
const rawBaseUrl =
  process.env.PDFDANCER_DOCS_BASE_URL ??
  'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/';

let apiBase: URL;
try {
  apiBase = new URL(rawBaseUrl);
} catch (error) {
  console.error(
    `Invalid PDFDancer documentation base URL "${rawBaseUrl}". Set PDFDANCER_DOCS_BASE_URL to a valid URL.`,
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
  title: 'PDFDancer SDK Documentation',
  overview:
    'This MCP server provides coding agents with searchable access to official PDFDancer SDK documentation. Use these tools to discover how to build PDF manipulation applications with pixel-perfect control over PDF documents using PDFDancer SDKs for Python, TypeScript, and Java.',
  sections: [
    {
      heading: 'What is PDFDancer?',
      items: [
        '- **Pixel-perfect PDF control**: Edit any PDF with exact coordinate positioning and surgical text replacement',
        '- **Edit existing PDFs**: Modify PDFs you did not create - invoices, forms, contracts, reports from any source',
        '- **Smart text handling**: Paragraph-aware editing that preserves layout and formatting',
        '- **Embedded font support**: Add text with embedded fonts for consistent rendering across all viewers',
        '- **Form manipulation**: Programmatically fill, update, or delete AcroForm fields',
        '- **Multi-language SDKs**: Available for Python 3.10+, TypeScript (Node.js 20+), and Java 11+',
        '- **Vector graphics control**: Full control over lines, curves, shapes, and complex drawings'
      ]
    },
    {
      heading: 'Available MCP Tools',
      items: [
        '- **search-docs**: Search PDFDancer documentation by keyword to find relevant APIs and examples',
        '- **get-docs**: Retrieve complete documentation for a specific route with code examples',
        '- **list-indexes**: Discover available SDK versions, languages, and documentation categories',
        '- **list-routes**: Browse all available documentation pages and guides',
        '- **help**: Display this overview with multi-language code samples'
      ]
    },
    {
      heading: 'Typical workflow for building PDFDancer applications',
      items: [
        '1. **Search documentation**: Use `search-docs` with keywords like "authentication", "edit text", "add paragraph", or "forms" to find relevant APIs',
        '2. **Get detailed docs**: Use `get-docs` with the route from search results to retrieve complete documentation with code examples',
        '3. **Review code samples**: Study the TypeScript, Python, or Java examples below that demonstrate common PDF manipulation tasks',
        '4. **Set up authentication**: Configure `PDFDANCER_TOKEN` environment variable (and optionally `PDFDANCER_BASE_URL` for self-hosted instances)',
        '5. **Implement features**: Use the SDK to open existing PDFs, locate elements by text or coordinates, edit content, add new elements, and save results'
      ]
    }
  ],
  codeSamples: [
    {
      language: 'TypeScript',
      syntax: 'ts',
      path: 'TypeScript SDK',
      description: 'Open an existing PDF, locate and edit a paragraph by text prefix, add new content with custom styling, and save the modified document.',
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
      path: 'Python SDK',
      description: 'Context-managed session demonstrating how to open a PDF, locate and move text paragraphs, edit their content, and add new styled paragraphs.',
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
      path: 'Java SDK',
      description: 'Java example showing how to create a PDF session, locate and reposition text elements, apply styling changes, and add new paragraphs programmatically.',
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
    description: 'MCP server providing searchable access to PDFDancer SDK documentation'
  });

  server.registerTool(
    'help',
    {
      title: 'PDFDancer MCP help',
      description: 'Explains the purpose of this server, key docs, and provides multi-language code samples.'
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
    'search-docs',
    {
      title: 'Search PDFDancer documentation',
      description: 'Search the official PDFDancer SDK documentation by keyword. Returns matching documentation routes with titles, content snippets, and relevance scores. Use this to find information about PDFDancer features, APIs, and usage examples.',
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
    'list-indexes',
    {
      title: 'List available documentation indexes',
      description: 'List all available PDFDancer documentation indexes and tags. Use this to discover which SDK versions, languages, or documentation categories are available for searching.'
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
    'list-routes',
    {
      title: 'List all documentation routes',
      description: 'List all available PDFDancer documentation routes. Use this to browse all documentation pages, articles, and guides available for retrieval. Returns route paths that can be used with get-docs.'
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
    'get-docs',
    {
      title: 'Get PDFDancer documentation',
      description: 'Retrieve the full documentation content for a specific route. After finding relevant documentation with search-docs, use this tool to get the complete markdown content including code examples, detailed explanations, and API references.',
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
