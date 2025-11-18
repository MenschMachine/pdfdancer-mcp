import {describe, it, expect, beforeAll} from 'vitest';
import {spawn, SpawnOptions} from 'child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const indexPath = join(__dirname, 'index.ts');

/**
 * Detect available shells on the current system
 */
function getAvailableShells(): Array<{name: string; command: string; args: string[]}> {
    const shells: Array<{name: string; command: string; args: string[]}> = [];

    if (process.platform === 'win32') {
        // Windows shells
        shells.push(
            {name: 'cmd', command: 'cmd.exe', args: ['/c']},
            {name: 'powershell', command: 'powershell.exe', args: ['-Command']},
            {name: 'pwsh', command: 'pwsh.exe', args: ['-Command']}
        );

        // Git Bash (if available)
        try {
            const gitBashPaths = [
                'C:\\Program Files\\Git\\bin\\bash.exe',
                'C:\\Program Files (x86)\\Git\\bin\\bash.exe'
            ];
            for (const path of gitBashPaths) {
                try {
                    require('fs').accessSync(path);
                    shells.push({name: 'git-bash', command: path, args: ['-c']});
                    break;
                } catch {
                    // Path doesn't exist
                }
            }
        } catch {
            // Git Bash not available
        }
    } else {
        // Unix shells
        shells.push(
            {name: 'sh', command: '/bin/sh', args: ['-c']},
            {name: 'bash', command: '/bin/bash', args: ['-c']}
        );

        // Optional shells (check if they exist)
        const optionalShells = [
            {name: 'zsh', command: '/bin/zsh', args: ['-c']},
            {name: 'dash', command: '/bin/dash', args: ['-c']},
            {name: 'fish', command: '/usr/bin/fish', args: ['-c']}
        ];

        for (const shell of optionalShells) {
            try {
                require('fs').accessSync(shell.command);
                shells.push(shell);
            } catch {
                // Shell not available
            }
        }
    }

    return shells;
}

/**
 * Start the MCP server through a specific shell
 */
async function startServerThroughShell(
    shellCommand: string,
    shellArgs: string[],
    env: Record<string, string> = {}
): Promise<{client: Client; close: () => Promise<void>}> {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const args = ['-y', 'tsx', indexPath];

    // Construct the full command for the shell
    const fullCommand = `${command} ${args.join(' ')}`;
    const finalArgs = [...shellArgs, fullCommand];

    const transport = new StdioClientTransport({
        command: shellCommand,
        args: finalArgs,
        env: {
            ...process.env,
            ...env,
            PDFDANCER_DOCS_BASE_URL:
                'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/'
        }
    });

    const client = new Client(
        {
            name: 'shell-test-client',
            version: '1.0.0'
        },
        {
            capabilities: {}
        }
    );

    await client.connect(transport);

    return {
        client,
        close: async () => {
            await client.close();
            // Give processes time to clean up
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };
}

describe('Shell Environment Tests', () => {
    let availableShells: Array<{name: string; command: string; args: string[]}>;

    beforeAll(() => {
        availableShells = getAvailableShells();
        console.log(
            `Detected shells: ${availableShells.map(s => s.name).join(', ')}`
        );
    });

    describe('Server startup across different shells', () => {
        for (const shell of getAvailableShells()) {
            it(`should start and respond in ${shell.name}`, async () => {
                try {
                    const {client, close} = await startServerThroughShell(
                        shell.command,
                        shell.args
                    );

                    try {
                        // Test basic connectivity
                        const tools = await client.listTools();
                        expect(tools.tools).toBeDefined();
                        expect(tools.tools.length).toBe(4);
                    } finally {
                        await close();
                    }
                } catch (error) {
                    // Skip if shell is not actually available
                    if (
                        error instanceof Error &&
                        (error.message.includes('ENOENT') ||
                            error.message.includes('not found'))
                    ) {
                        console.log(`Skipping ${shell.name}: not available`);
                        return;
                    }
                    throw error;
                }
            }, 30000);
        }
    });

    describe('Environment variable handling', () => {
        it('should handle different locale settings', async () => {
            const shell = availableShells[0];
            const {client, close} = await startServerThroughShell(
                shell.command,
                shell.args,
                {
                    LANG: 'en_US.UTF-8',
                    LC_ALL: 'en_US.UTF-8'
                }
            );

            try {
                const result = await client.callTool({
                    name: 'version',
                    arguments: {}
                });
                expect(result.content).toBeDefined();
            } finally {
                await close();
            }
        }, 30000);

        it('should handle ASCII locale', async () => {
            const shell = availableShells[0];
            const {client, close} = await startServerThroughShell(
                shell.command,
                shell.args,
                {
                    LANG: 'C',
                    LC_ALL: 'C'
                }
            );

            try {
                const result = await client.callTool({
                    name: 'version',
                    arguments: {}
                });
                expect(result.content).toBeDefined();
            } finally {
                await close();
            }
        }, 30000);

        it('should handle custom PDFDANCER_DOCS_BASE_URL', async () => {
            const shell = availableShells[0];
            const {client, close} = await startServerThroughShell(
                shell.command,
                shell.args,
                {
                    PDFDANCER_DOCS_BASE_URL:
                        'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/'
                }
            );

            try {
                const tools = await client.listTools();
                expect(tools.tools.length).toBe(4);
            } finally {
                await close();
            }
        }, 30000);
    });

    describe('Non-interactive shell behavior', () => {
        it('should work without TTY', async () => {
            const shell = availableShells[0];

            // Spawn without a TTY
            const transport = new StdioClientTransport({
                command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
                args: ['-y', 'tsx', indexPath],
                env: {
                    ...process.env,
                    TERM: undefined, // Remove terminal info
                    PDFDANCER_DOCS_BASE_URL:
                        'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/'
                }
            });

            const client = new Client(
                {
                    name: 'no-tty-client',
                    version: '1.0.0'
                },
                {
                    capabilities: {}
                }
            );

            try {
                await client.connect(transport);
                const tools = await client.listTools();
                expect(tools.tools.length).toBe(4);
                await client.close();
            } catch (error) {
                await client.close();
                throw error;
            }
        }, 30000);
    });

    describe('Path and working directory handling', () => {
        it('should work regardless of current working directory', async () => {
            const shell = availableShells[0];
            const {client, close} = await startServerThroughShell(
                shell.command,
                shell.args,
                {
                    PWD: '/tmp'
                }
            );

            try {
                const result = await client.callTool({
                    name: 'version',
                    arguments: {}
                });
                expect(result.content).toBeDefined();
            } finally {
                await close();
            }
        }, 30000);
    });

    describe('Special character handling in shell', () => {
        it('should handle queries with special shell characters', async () => {
            const shell = availableShells[0];
            const {client, close} = await startServerThroughShell(
                shell.command,
                shell.args
            );

            try {
                // Test queries that might break shell escaping
                const specialQueries = [
                    'page & document',
                    'page | filter',
                    'page; test',
                    'page $(echo test)',
                    'page `echo test`',
                    'page "quoted"',
                    "page 'single'",
                    'page\\escaped'
                ];

                for (const query of specialQueries) {
                    try {
                        await client.callTool({
                            name: 'search-docs',
                            arguments: {query}
                        });
                        // Should not throw or execute shell commands
                    } catch (error) {
                        // Network errors are acceptable
                        if (
                            error instanceof Error &&
                            !error.message.includes('fetch failed') &&
                            !error.message.includes('Request to')
                        ) {
                            throw error;
                        }
                    }
                }
            } finally {
                await close();
            }
        }, 60000);
    });
});
