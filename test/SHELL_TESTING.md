# Shell Environment Testing Guide

This guide explains how to test the PDFDancer MCP server across different shell environments to ensure reliability in any user environment.

## Why Shell Environment Testing?

Different users run MCP servers in vastly different environments:
- **Different shells**: bash, zsh, fish, PowerShell, cmd, sh, dash
- **Different platforms**: Linux, macOS, Windows, WSL
- **Different locales**: UTF-8, ASCII, non-English locales
- **Different permission levels**: root, non-root, restricted environments
- **Different terminals**: TTY, non-TTY (CI/CD), interactive vs non-interactive

Testing across these environments ensures the MCP server works reliably for all users.

---

## Testing Approaches

### 1️⃣ **GitHub Actions Matrix Testing** (Automated, CI/CD)

**File**: `.github/workflows/test-shells.yml`

Tests the MCP server across multiple shells automatically on every push/PR.

**Coverage**:
- **Unix Shells**: bash, sh, zsh (macOS), dash (Ubuntu)
- **Windows Shells**: PowerShell, PowerShell Core (pwsh), CMD
- **Special Environments**: Git Bash (Windows), WSL (Ubuntu on Windows)
- **Node.js versions**: 18, 22
- **Operating Systems**: Ubuntu, macOS, Windows

**How to use**:
```bash
# Automatically runs on push/PR
git push

# Or trigger manually via GitHub Actions UI
```

**What it tests**:
- ✅ Server installation via `npm ci`
- ✅ Build process in each shell
- ✅ E2E test execution
- ✅ npx execution through different shells

---

### 2️⃣ **Local Shell-Specific Tests** (Vitest)

**File**: `src/shell.environment.test.ts`

Comprehensive test suite that automatically detects available shells and tests the MCP server through each one.

**Coverage**:
- Auto-detects available shells on your system
- Tests server startup through each shell
- Tests environment variable handling
- Tests non-TTY (non-interactive) mode
- Tests working directory independence
- Tests special character handling (prevents shell injection)

**How to run**:
```bash
# Run shell environment tests
npm test src/shell.environment.test.ts

# Or include in full test suite
npm run test:all
```

**What it tests**:
```typescript
// Detects and tests available shells
✓ sh, bash, zsh, dash, fish (Unix)
✓ cmd, PowerShell, pwsh, Git Bash (Windows)

// Environment variables
✓ Different locales (en_US.UTF-8, C, etc.)
✓ Custom PDFDANCER_DOCS_BASE_URL

// Edge cases
✓ No TTY (CI/CD mode)
✓ Different working directories
✓ Special shell characters in queries
```

---

### 3️⃣ **Docker Multi-Shell Testing** (Comprehensive)

**File**: `test/Dockerfile.shells`

Multi-stage Docker build that tests across isolated, reproducible environments.

**Available test stages**:

| Stage | Description | Shells Tested |
|-------|-------------|---------------|
| `alpine-multi-shell` | Alpine Linux with multiple shells | sh, bash, dash, zsh, fish |
| `debian-shells` | Debian with comprehensive shell coverage | bash, dash, zsh, ksh, fish, tcsh |
| `ubuntu-restricted` | Non-root user with limited permissions | bash (restricted) |
| `minimal-shell` | Minimal environment (no bash) | sh only |
| `locale-testing` | Different locale settings | bash (en_US, ja_JP, de_DE, C) |
| `ci-simulation` | CI/CD non-interactive environment | sh (no TTY) |

**How to run**:

```bash
# Make the test script executable
chmod +x test/run-shell-tests.sh

# Run all Docker-based shell tests
./test/run-shell-tests.sh

# Or run individual stages
docker build -f test/Dockerfile.shells --target alpine-multi-shell -t test:alpine .
docker run --rm test:alpine

docker build -f test/Dockerfile.shells --target minimal-shell -t test:minimal .
docker run --rm test:minimal

docker build -f test/Dockerfile.shells --target locale-testing -t test:locale .
docker run --rm test:locale
```

**What it tests**:
- ✅ Multiple shell types in isolated environments
- ✅ Minimal dependencies (sh-only environments)
- ✅ Permission restrictions (non-root users)
- ✅ Different Linux distributions
- ✅ Various locale configurations
- ✅ CI/CD simulation (non-interactive, no TTY)

---

## Quick Start Guide

### Local Development Testing

```bash
# 1. Run standard tests
npm test

# 2. Run shell environment tests
npm test src/shell.environment.test.ts

# 3. Run Docker-based comprehensive tests
./test/run-shell-tests.sh
```

### CI/CD Integration

The shell tests run automatically on GitHub Actions for every push and PR. Check the workflow runs:

```
https://github.com/MenschMachine/pdfdancer-mcp/actions
```

---

## Test Coverage Matrix

| Environment | Local Tests | GitHub Actions | Docker |
|-------------|-------------|----------------|--------|
| **Unix: bash** | ✅ | ✅ | ✅ |
| **Unix: sh** | ✅ | ✅ | ✅ |
| **Unix: zsh** | ✅ | ✅ (macOS) | ✅ |
| **Unix: dash** | ✅ | ✅ (Ubuntu) | ✅ |
| **Unix: fish** | ✅ | ❌ | ✅ |
| **Unix: ksh** | ❌ | ❌ | ✅ |
| **Unix: tcsh** | ❌ | ❌ | ✅ |
| **Windows: PowerShell** | ✅ | ✅ | ❌ |
| **Windows: pwsh** | ✅ | ✅ | ❌ |
| **Windows: CMD** | ✅ | ✅ | ❌ |
| **Windows: Git Bash** | ✅ | ✅ | ❌ |
| **Windows: WSL** | ❌ | ✅ | ❌ |
| **Non-TTY** | ✅ | ✅ | ✅ |
| **Restricted Permissions** | ❌ | ❌ | ✅ |
| **Different Locales** | ✅ | ❌ | ✅ |

---

## Adding New Shell Tests

### Adding a new shell to local tests

Edit `src/shell.environment.test.ts`:

```typescript
const optionalShells = [
    {name: 'zsh', command: '/bin/zsh', args: ['-c']},
    {name: 'YOUR_SHELL', command: '/path/to/shell', args: ['-c']},  // Add here
];
```

### Adding a new shell to Docker tests

Edit `test/Dockerfile.shells`:

```dockerfile
# Create a new stage
FROM node:22-alpine AS your-shell-test

RUN apk add --no-cache your-shell

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

CMD ["your-shell", "-c", "npm test"]
```

Then update `test/run-shell-tests.sh`:

```bash
# Add to the test sequence
run_docker_test "your-shell-test" "Description of your shell test"
record_result "Your Shell Test" $?
```

### Adding a new shell to GitHub Actions

Edit `.github/workflows/test-shells.yml`:

```yaml
# Add to the matrix
include:
  - os: ubuntu-latest
    shell: your-shell
    node-version: 22
```

---

## Common Issues and Solutions

### Issue: Shell not detected in local tests

**Solution**: The test auto-detects shells by checking if the binary exists. Install the shell or update the detection logic in `src/shell.environment.test.ts`.

### Issue: Docker tests fail with permission errors

**Solution**: The `ubuntu-restricted` stage tests this scenario. Check that your MCP server doesn't require root permissions.

### Issue: Tests pass locally but fail in CI

**Solution**: Run the Docker tests locally to simulate the CI environment:

```bash
./test/run-shell-tests.sh
```

### Issue: Shell-specific syntax errors

**Solution**: Ensure you're using POSIX-compatible commands in `package.json` scripts. Avoid bash-specific syntax like:
- `[[` instead use `[`
- `source` instead use `.`
- `{1..10}` instead use `seq 1 10`

---

## Performance Considerations

**Local tests** (~2-3 minutes):
- Fast iteration during development
- Only tests shells available on your system

**GitHub Actions** (~10-15 minutes):
- Comprehensive cross-platform testing
- Tests all Node.js versions and OS combinations

**Docker tests** (~15-20 minutes):
- Most comprehensive shell coverage
- Tests isolated environments
- Best for pre-release validation

---

## Best Practices

1. **Run local tests** during development for quick feedback
2. **Use GitHub Actions** for automated testing on every commit
3. **Run Docker tests** before major releases to ensure comprehensive coverage
4. **Add new shell tests** when users report shell-specific issues
5. **Keep tests shell-agnostic** - avoid shell-specific syntax in package.json scripts

---

## Contributing

When adding new features to the MCP server:

1. ✅ Ensure tests pass in local shell tests
2. ✅ Verify GitHub Actions passes for all shells
3. ✅ Run Docker tests for comprehensive validation
4. ✅ Update this documentation if adding new shell support

---

## Questions?

- Check existing tests in `src/shell.environment.test.ts`
- Review Docker stages in `test/Dockerfile.shells`
- See workflow configuration in `.github/workflows/test-shells.yml`
- Open an issue if you find shell-specific bugs
