#!/usr/bin/env node
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import packageJson from '../package.json' assert {type: 'json'};

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
            ...(options.body ? {'Content-Type': 'application/json'} : {})
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
                '- **help**: Display this overview',
                '- **version**: Get the current version of the pdfdancer-mcp server',
                '- **search-docs**: Search PDFDancer documentation by keyword to find relevant APIs and examples (max 10 results)',
                '- **get-docs**: Retrieve complete documentation for a specific route with code examples'
            ]
        },
        {
            heading: 'Search Syntax (Lunr.js)',
            items: [
                '- **Simple keywords** (OR logic): `Java images add` → matches documents with ANY word',
                '- **Require ALL words**: `+Java +images +add` → matches only documents with ALL words (recommended for precise results)',
                '- **Exclude words**: `+React -deprecated` → must have "React", must NOT have "deprecated"',
                '- **Boost importance**: `authentication^10 tutorial` → prioritizes "authentication" results',
                '- **Field search**: `title:installation` → searches only in title field',
                '- **Wildcard**: `install*` → matches "install", "installation", "installer"',
                '- **Fuzzy search**: `javascript~2` → tolerates up to 2 character differences (typos)',
                '- **Exact phrase**: `title:"Java images"` → searches for exact phrase in title',
                '- **Available fields**: title, content, tags, sidebarParentCategories'
            ]
        },
        {
            heading: 'Typical workflow for building PDFDancer applications',
            items: [
                '1. **Search documentation**: Use `search-docs` with keywords like "authentication", "edit text", "add paragraph", or "forms" to find relevant APIs',
                '2. **Get detailed docs**: Use `get-docs` with the route from search results to retrieve complete documentation with code examples',
                '3. **Implement features**: Use the SDK to open existing PDFs, locate elements by text or coordinates, edit content, add new elements, and save results'
            ]
        }
    ],
};

function renderHelpDocument(doc: HelpDocument): string {
    const sections = doc.sections
        .map(section => `### ${section.heading}\n${section.items.join('\n')}`)
        .join('\n\n');
    return `# ${doc.title}\n\n${doc.overview}\n\n${sections}`.trim();
}

async function main() {
    const server = new McpServer({
        name: 'pdfdancer-mcp',
        version: pkg.version ?? '0.0.0'
    });

    server.registerTool(
        'help',
        {
            title: 'PDFDancer MCP help',
            description: 'Explains the purpose of this server and how to use it.'
        },
        async () => {
            const text = renderHelpDocument(helpDocument);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text
                    }
                ],
                structuredContent: helpDocument
            };
        }
    );

    server.registerTool(
        'version',
        {
            title: 'Get server version',
            description: 'Returns the current version of the pdfdancer-mcp server.'
        },
        async () => {
            const version = pkg.version ?? 'unknown';
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `pdfdancer-mcp version: ${version}`
                    }
                ],
                structuredContent: {version}
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
                maxResults: z.number().int().min(1).max(10).optional()
            }
        },
        async ({query, maxResults}) => {
            const data = await callApi<SearchResponse>('/search', {
                searchParams: {
                    q: query,
                    maxResults
                }
            });

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `${summarizeSearchResponse(data)}\n\n${formatJsonBlock('Raw search response', data)}`
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
        async ({route}) => {
            const data = await callApi<ContentResponse>('/content', {
                searchParams: {
                    route
                }
            });

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: formatJsonBlock(`Content for ${route}`, data)
                    },
                    {
                        type: 'text' as const,
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
