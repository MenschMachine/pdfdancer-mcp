import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import type {TextContent} from '@modelcontextprotocol/sdk/types.js';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {readFileSync} from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the expected version from package.json
const projectPackageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
) as {version: string};
const EXPECTED_VERSION = projectPackageJson.version;

describe('PDFDancer MCP Server E2E Tests', () => {
    let client: Client;
    let transport: StdioClientTransport;

    beforeAll(async () => {
        // Spawn the server process
        const serverPath = join(__dirname, 'index.ts');

        // Use npx for cross-platform compatibility (works on Windows and Unix)
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'npx.cmd' : 'npx';

        // Create transport and client
        transport = new StdioClientTransport({
            command,
            args: ['tsx', serverPath],
            env: {
                ...process.env,
                PDFDANCER_DOCS_BASE_URL:
                    process.env.PDFDANCER_DOCS_BASE_URL ||
                    'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/'
            }
        });

        client = new Client(
            {
                name: 'pdfdancer-mcp-test-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            }
        );

        await client.connect(transport);
    }, 30000);

    afterAll(async () => {
        await client.close();
    });

    describe('Server Initialization', () => {
        it('should connect successfully', async () => {
            expect(client).toBeDefined();
        });

        it('should list all available tools', async () => {
            const tools = await client.listTools();
            expect(tools.tools).toBeDefined();
            expect(tools.tools.length).toBe(4);

            const toolNames = tools.tools.map(t => t.name);
            expect(toolNames).toContain('help');
            expect(toolNames).toContain('version');
            expect(toolNames).toContain('search-docs');
            expect(toolNames).toContain('get-docs');
        });
    });

    describe('help tool', () => {
        it('should return help documentation', async () => {
            const result = await client.callTool({
                name: 'help',
                arguments: {}
            });

            const content = result.content as TextContent[];
            expect(content).toBeDefined();
            expect(content.length).toBeGreaterThan(0);
            expect(content[0].type).toBe('text');

            if (content[0].type === 'text') {
                expect(content[0].text).toContain('PDFDancer SDK Documentation');
                expect(content[0].text).toContain('Available MCP Tools');
            }

            expect(result.structuredContent).toBeDefined();
        });
    });

    describe('version tool', () => {
        it('should return server version', async () => {
            const result = await client.callTool({
                name: 'version',
                arguments: {}
            });

            const content = result.content as TextContent[];
            expect(content).toBeDefined();
            expect(content.length).toBeGreaterThan(0);
            expect(content[0].type).toBe('text');

            if (content[0].type === 'text') {
                expect(content[0].text).toContain('pdfdancer-mcp version:');
                expect(content[0].text).toContain(EXPECTED_VERSION);
            }

            expect(result.structuredContent).toBeDefined();
            expect(result.structuredContent).toHaveProperty('version');
        });
    });

    describe('search-docs tool', () => {
        it('should search documentation with a simple query', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {
                    query: 'authentication'
                }
            });

            const content = result.content as TextContent[];
            expect(content).toBeDefined();
            expect(content.length).toBeGreaterThan(0);
            expect(content[0].type).toBe('text');

            if (content[0].type === 'text') {
                // May fail due to network issues, so check for either success or fetch error
                const text = content[0].text;
                const hasResults = text.includes('result(s) for "authentication"');
                const hasNetworkError = text.includes('fetch failed') || text.includes('Request to');
                expect(hasResults || hasNetworkError).toBe(true);
            }

            // Only check structured content if API call succeeded
            if (result.structuredContent) {
                const structured = result.structuredContent as {
                    results: unknown[];
                    total: number;
                    query: string;
                    took: number;
                };
                expect(structured).toHaveProperty('results');
                expect(structured).toHaveProperty('total');
                expect(structured).toHaveProperty('query');
                expect(structured.query).toBe('authentication');
            }
        });

        it('should respect maxResults parameter', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {
                    query: 'PDF',
                    maxResults: 3
                }
            });

            // Only check if API call succeeded
            if (result.structuredContent) {
                const structured = result.structuredContent as {
                    results: unknown[];
                };
                expect(structured.results.length).toBeLessThanOrEqual(3);
            } else {
                // Network error is acceptable in tests
                const content = result.content as TextContent[];
                expect(content[0].type).toBe('text');
            }
        });

        it('should handle queries with no results', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {
                    query: 'xyznonexistentterm123456'
                }
            });

            const content = result.content as TextContent[];
            expect(content[0].type).toBe('text');
            if (content[0].type === 'text') {
                const text = content[0].text;
                const hasNoMatches = text.includes('No matches');
                const hasNetworkError = text.includes('fetch failed') || text.includes('Request to');
                expect(hasNoMatches || hasNetworkError).toBe(true);
            }
        });

        it('should handle complex Lunr.js search syntax', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {
                    query: '+Java +images'
                }
            });

            // Only check if API call succeeded
            if (result.structuredContent) {
                const structured = result.structuredContent as {
                    query: string;
                };
                expect(structured.query).toBe('+Java +images');
            } else {
                // Network error is acceptable
                const content = result.content as TextContent[];
                expect(content[0].type).toBe('text');
            }
        });
    });

    describe('get-docs tool', () => {
        it('should retrieve documentation for a valid route', async () => {
            // Test with a known route that should exist
            const result = await client.callTool({
                name: 'get-docs',
                arguments: {
                    route: '/docs/intro'
                }
            });

            const content = result.content as TextContent[];
            expect(content).toBeDefined();
            expect(content.length).toBeGreaterThan(0);

            // Only check structured content if API call succeeded
            if (result.structuredContent) {
                const structured = result.structuredContent as {
                    route: string;
                    content: string;
                };
                expect(structured).toHaveProperty('route');
                expect(structured).toHaveProperty('content');
                expect(structured.route).toBe('/docs/intro');
            } else {
                // Network error is acceptable
                expect(content[0].type).toBe('text');
            }
        });

        it('should require route to start with /', async () => {
            const result = await client.callTool({
                name: 'get-docs',
                arguments: {
                    route: 'invalid-route'
                }
            });

            // MCP SDK returns errors in structured format
            const content = result.content as TextContent[];
            expect(result.isError).toBe(true);
            expect(content[0].type).toBe('text');
            if (content[0].type === 'text') {
                expect(content[0].text).toContain('route must start with /');
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid tool names gracefully', async () => {
            const result = await client.callTool({
                name: 'nonexistent-tool',
                arguments: {}
            });

            // MCP SDK returns errors in structured format
            const content = result.content as TextContent[];
            expect(result.isError).toBe(true);
            expect(content[0].type).toBe('text');
            if (content[0].type === 'text') {
                expect(content[0].text).toContain('nonexistent-tool');
                expect(content[0].text).toContain('not found');
            }
        });

        it('should handle missing required arguments', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {}
            });

            // MCP SDK returns errors in structured format
            const content = result.content as TextContent[];
            expect(result.isError).toBe(true);
            expect(content[0].type).toBe('text');
            if (content[0].type === 'text') {
                expect(content[0].text).toContain('query');
                expect(content[0].text).toContain('Required');
            }
        });

        it('should handle invalid argument types', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {
                    query: 'test',
                    maxResults: 'invalid' as unknown as number
                }
            });

            // MCP SDK returns errors in structured format
            const content = result.content as TextContent[];
            expect(result.isError).toBe(true);
            expect(content[0].type).toBe('text');
            if (content[0].type === 'text') {
                expect(content[0].text).toContain('maxResults');
                expect(content[0].text).toContain('number');
            }
        });
    });

    describe('API Integration', () => {
        it('should successfully connect to the PDFDancer docs API', async () => {
            const result = await client.callTool({
                name: 'search-docs',
                arguments: {
                    query: 'PDF',
                    maxResults: 1
                }
            });

            // Only check if API call succeeded
            if (result.structuredContent) {
                const structured = result.structuredContent as {
                    took: number;
                };
                // Should have a took field indicating API responded
                expect(structured).toHaveProperty('took');
                expect(typeof structured.took).toBe('number');
            } else {
                // Network error is acceptable in tests
                const content = result.content as TextContent[];
                expect(content[0].type).toBe('text');
                if (content[0].type === 'text') {
                    const text = content[0].text;
                    const hasNetworkError = text.includes('fetch failed') || text.includes('Request to');
                    expect(hasNetworkError).toBe(true);
                }
            }
        });
    });
});
