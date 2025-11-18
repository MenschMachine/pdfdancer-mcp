import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {execSync} from 'child_process';
import {mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync} from 'fs';
import {tmpdir} from 'os';
import {join, resolve} from 'path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

// Check if mcptools is available
function getMcptoolsPath(): string | null {
    try {
        // Use platform-specific command to find mcptools
        if (process.platform === 'win32') {
            // On Windows, where.exe returns Windows native paths
            return execSync('where.exe mcptools', {encoding: 'utf-8'}).split('\n')[0].trim();
        } else {
            return execSync('which mcptools', {encoding: 'utf-8'}).trim();
        }
    } catch {
        try {
            const gopath = execSync('go env GOPATH', {encoding: 'utf-8'}).trim();
            const mcptoolsPath = join(gopath, 'bin', process.platform === 'win32' ? 'mcptools.exe' : 'mcptools');
            if (existsSync(mcptoolsPath)) {
                return mcptoolsPath;
            }
        } catch {
            // Go not installed
        }
        return null;
    }
}

describe('NPM Package Installation Tests', () => {
    let testDir: string;
    let tarballPath: string;
    let projectRoot: string;

    beforeAll(() => {
        projectRoot = process.cwd();

        // Create a temporary directory for testing
        testDir = mkdtempSync(join(tmpdir(), 'pdfdancer-mcp-test-'));

        // Build the package
        console.log('Building package...');
        execSync('npm run build', {
            cwd: projectRoot,
            stdio: 'inherit'
        });

        // Pack the package
        console.log('Packing package...');
        const packOutput = execSync('npm pack', {
            cwd: projectRoot,
            encoding: 'utf-8'
        });

        // Get the tarball filename from output and create absolute path
        const tarballFilename = packOutput.trim().split('\n').pop() || '';
        tarballPath = resolve(projectRoot, tarballFilename);

        console.log(`Created tarball: ${tarballPath}`);
    }, 120000); // 2 minute timeout for build

    afterAll(() => {
        // Cleanup test directory
        if (testDir) {
            rmSync(testDir, {recursive: true, force: true});
        }
    });

    it('should successfully build the package', () => {
        expect(tarballPath).toBeTruthy();
        expect(tarballPath).toMatch(/\.tgz$/);
    });

    it('should be installable from tarball', () => {
        console.log(`Installing ${tarballPath} in ${testDir}...`);

        // Initialize a package.json in test directory
        writeFileSync(
            join(testDir, 'package.json'),
            JSON.stringify({name: 'test-install', version: '1.0.0'}, null, 2)
        );

        // Install the package from tarball using absolute path
        execSync(`npm install "${tarballPath}"`, {
            cwd: testDir,
            stdio: 'inherit'
        });

        // Verify installation succeeded
        const packageJson = JSON.parse(
            execSync('npm list --json', {
                cwd: testDir,
                encoding: 'utf-8'
            })
        );

        expect(packageJson.dependencies).toHaveProperty('@pdfdancer/pdfdancer-mcp');
    }, 60000);

    it('should have executable binary in node_modules/.bin', () => {
        const binPath = join(testDir, 'node_modules', '.bin', 'pdfdancer-mcp');

        // Check if binary exists (on Unix) or .cmd exists (on Windows)
        const existsUnix = existsSync(binPath);
        const existsWin = existsSync(`${binPath}.cmd`);

        expect(existsUnix || existsWin).toBe(true);
    });

    it('should run via npx and respond to MCP protocol', async () => {
        const binPath = join(testDir, 'node_modules', '@pdfdancer', 'pdfdancer-mcp', 'dist', 'index.js');

        // Create MCP client
        const transport = new StdioClientTransport({
            command: 'node',
            args: [binPath],
            env: {
                ...process.env,
                PDFDANCER_DOCS_BASE_URL:
                    'https://docusaurus-cloudflare-search.michael-lahr-0b0.workers.dev/'
            }
        });

        const client = new Client(
            {
                name: 'package-test-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            }
        );

        try {
            await client.connect(transport);

            // Test that we can list tools
            const tools = await client.listTools();
            expect(tools.tools).toBeDefined();
            expect(tools.tools.length).toBe(4);

            // Test version tool
            const result = await client.callTool({
                name: 'version',
                arguments: {}
            });

            expect(result.content).toBeDefined();
            expect(Array.isArray(result.content)).toBe(true);

            await client.close();
        } catch (error) {
            await client.close();
            throw error;
        }
    }, 30000);

    it('should have correct package.json metadata', () => {
        const pkgJsonPath = join(testDir, 'node_modules', '@pdfdancer', 'pdfdancer-mcp', 'package.json');
        const pkgJsonContent = execSync(`cat "${pkgJsonPath}"`, {encoding: 'utf-8'});
        const installedPkgJson = JSON.parse(pkgJsonContent);

        // Verify package name
        expect(installedPkgJson.name).toBe('@pdfdancer/pdfdancer-mcp');

        // Verify version
        expect(installedPkgJson.version).toBe('0.1.1');

        // Verify bin entry exists
        expect(installedPkgJson.bin).toBeDefined();
        expect(installedPkgJson.bin).toBe('./dist/index.js');

        // Verify main entry
        expect(installedPkgJson.main).toBe('./dist/index.js');

        // Verify type is module
        expect(installedPkgJson.type).toBe('module');

        // Verify engines
        expect(installedPkgJson.engines).toBeDefined();
        expect(installedPkgJson.engines.node).toBe('>=18.17');
    });

    it('should only include dist folder in published package', () => {
        const installedDir = join(testDir, 'node_modules', '@pdfdancer', 'pdfdancer-mcp');
        const installedFiles = readdirSync(installedDir);

        // Should have dist folder
        expect(installedFiles).toContain('dist');

        // Should have package.json
        expect(installedFiles).toContain('package.json');

        // Should NOT have src folder (not in files array)
        expect(installedFiles).not.toContain('src');

        // Should NOT have node_modules
        expect(installedFiles).not.toContain('node_modules');
    });

    it('should work with mcptools CLI (third-party MCP client)', () => {
        const mcptoolsPath = getMcptoolsPath();
        expect(mcptoolsPath).toBeTruthy(); // Fail if mcptools is not found

        // Find npx path
        let npxPath: string;
        try {
            if (process.platform === 'win32') {
                // On Windows, use where.exe to find npx.cmd
                // Split first, then trim to handle Windows \r\n line endings properly
                npxPath = execSync('where.exe npx.cmd', {encoding: 'utf-8'}).split('\n')[0].trim();
            } else {
                npxPath = execSync('which npx', {encoding: 'utf-8'}).trim();
            }
        } catch (error) {
            throw new Error('npx not found in PATH');
        }

        // Construct PATH with platform-specific separator
        const binPath = join(testDir, 'node_modules', '.bin');
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const newPath = `${binPath}${pathSeparator}${process.env.PATH}`;

        // Test version command
        const versionResult = execSync(
            `${mcptoolsPath} call version "${npxPath}" -y @pdfdancer/pdfdancer-mcp`,
            {
                encoding: 'utf-8',
                cwd: testDir,
                env: {
                    ...process.env,
                    PATH: newPath
                }
            }
        );

        expect(versionResult).toContain('pdfdancer-mcp version:');
        expect(versionResult).toContain('0.1.1');

        // Test search-docs command with JSON output
        const searchResult = execSync(
            `${mcptoolsPath} call search-docs -p '{"query":"page"}' "${npxPath}" -y @pdfdancer/pdfdancer-mcp`,
            {
                encoding: 'utf-8',
                cwd: testDir,
                env: {
                    ...process.env,
                    PATH: newPath
                }
            }
        );

        // Should contain search results or network error
        const hasResults = searchResult.includes('result(s) for "page"');
        const hasNetworkError =
            searchResult.includes('fetch failed') || searchResult.includes('Request to');

        expect(hasResults || hasNetworkError).toBe(true);

        // If results exist, verify structure
        if (hasResults) {
            expect(searchResult).toContain('Raw search response');
            expect(searchResult).toContain('"query": "page"');
        }
    }, 60000);
});
