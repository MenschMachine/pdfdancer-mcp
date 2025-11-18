# Shell Environment Testing

## Overview

This directory contains comprehensive shell environment testing for the PDFDancer MCP server.

```
┌─────────────────────────────────────────────────────────────┐
│                   Shell Testing Strategy                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Local      │      │   Docker     │      │  GitHub      │
│   Tests      │      │   Tests      │      │  Actions     │
│              │      │              │      │              │
│  • Fast      │      │ • Isolated   │      │ • Automatic  │
│  • Quick     │      │ • Complete   │      │ • Matrix     │
│  • Dev       │      │ • Pre-release│      │ • Every push │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │                     │                     │
       v                     v                     v
┌─────────────────────────────────────────────────────────────┐
│              Shells Tested                                   │
├─────────────────────────────────────────────────────────────┤
│ Unix:    bash, sh, zsh, dash, fish, ksh, tcsh              │
│ Windows: PowerShell, pwsh, CMD, Git Bash                    │
│ Special: WSL, non-root, no-TTY, minimal, locales           │
└─────────────────────────────────────────────────────────────┘
```

## Quick Commands

```bash
# Local testing (2 minutes)
npm run test:shells

# Docker testing (15 minutes)
npm run test:shells:docker

# Standard tests (30 seconds)
npm test
```

## Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide
- **[SHELL_TESTING.md](./SHELL_TESTING.md)** - Complete testing guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details

## Files

- `Dockerfile.shells` - Multi-stage Docker testing environments
- `run-shell-tests.sh` - Automated Docker test runner

## What Gets Tested?

| Category | Tests |
|----------|-------|
| **Shells** | 13 different shell environments |
| **Platforms** | Linux, macOS, Windows, WSL |
| **Node.js** | Versions 18-25 |
| **Locales** | UTF-8, ASCII, non-English |
| **Permissions** | Root, non-root, restricted |
| **Terminal** | TTY, non-TTY, interactive |

## Test Coverage

- ✅ Server initialization across all shells
- ✅ MCP protocol compliance
- ✅ All 4 tools (help, version, search-docs, get-docs)
- ✅ Environment variable handling
- ✅ Special character handling (shell injection prevention)
- ✅ Error handling and validation
- ✅ Permission restrictions
- ✅ Locale compatibility

## CI/CD Integration

Tests run automatically on:
- Every push to any branch
- Every pull request to main
- 50+ different environment combinations

View results: [GitHub Actions](https://github.com/MenschMachine/pdfdancer-mcp/actions)

## Adding New Tests

See [SHELL_TESTING.md](./SHELL_TESTING.md#adding-new-shell-tests) for instructions on:
- Adding new shells to local tests
- Adding new Docker test stages
- Adding new GitHub Actions workflows
