# Shell Testing Quick Start

Quick commands to run shell environment tests.

## Local Testing (Fast - 2 minutes)

```bash
# Test across shells available on your system
npm run test:shells
```

This auto-detects and tests:
- Unix: bash, sh, zsh, dash, fish
- Windows: cmd, PowerShell, pwsh, Git Bash

## Docker Testing (Comprehensive - 15 minutes)

```bash
# Test all shell environments in isolation
npm run test:shells:docker
```

Tests 6 different environments:
1. ✅ Alpine multi-shell (sh, bash, dash, zsh, fish)
2. ✅ Debian shells (bash, dash, zsh, ksh, fish, tcsh)
3. ✅ Restricted permissions (non-root user)
4. ✅ Minimal shell (sh only, no bash)
5. ✅ Locale testing (UTF-8, Japanese, German, C)
6. ✅ CI simulation (non-interactive, no TTY)

## Individual Docker Tests

```bash
# Test specific environment
docker build -f test/Dockerfile.shells --target alpine-multi-shell -t test:alpine .
docker run --rm test:alpine

# Available targets:
# - alpine-multi-shell
# - debian-shells
# - ubuntu-restricted
# - minimal-shell
# - locale-testing
# - ci-simulation
```

## CI/CD Testing (Automatic)

Shell tests run automatically on GitHub Actions for:
- ✅ Every push to any branch
- ✅ Every pull request to main
- ✅ 16 combinations (8 Node versions × 2 OS)
- ✅ Additional shell matrix (bash, sh, zsh, dash, PowerShell, cmd, Git Bash, WSL)

View results: https://github.com/MenschMachine/pdfdancer-mcp/actions

## What Gets Tested?

| Test Type | Local | Docker | CI |
|-----------|-------|--------|-----|
| Shell startup | ✅ | ✅ | ✅ |
| Environment variables | ✅ | ✅ | ✅ |
| Non-TTY mode | ✅ | ✅ | ✅ |
| Different locales | ✅ | ✅ | ❌ |
| Restricted permissions | ❌ | ✅ | ❌ |
| Special characters | ✅ | ✅ | ✅ |

## Full Documentation

See [SHELL_TESTING.md](./SHELL_TESTING.md) for complete details.
