#!/bin/bash
# Shell Environment Testing Script
# Runs MCP server tests across different shell environments using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🐚 PDFDancer MCP Shell Environment Testing Suite"
echo "================================================"
echo ""

# Function to run tests in a specific Docker stage
run_docker_test() {
    local stage=$1
    local description=$2

    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "Stage: $stage"
    echo "----------------------------------------"

    if docker build -f test/Dockerfile.shells --target "$stage" -t "pdfdancer-mcp-test:$stage" .; then
        if docker run --rm "pdfdancer-mcp-test:$stage"; then
            echo -e "${GREEN}✓ Passed: $description${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed: $description${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Build failed: $description${NC}"
        return 1
    fi
    echo ""
}

# Track results
PASSED=0
FAILED=0
TESTS=()

# Function to record test result
record_result() {
    local name=$1
    local result=$2

    if [ $result -eq 0 ]; then
        PASSED=$((PASSED + 1))
        TESTS+=("✓ $name")
    else
        FAILED=$((FAILED + 1))
        TESTS+=("✗ $name")
    fi
}

# Run all test stages
echo "Starting shell environment tests..."
echo ""

# Test 1: Alpine with multiple shells
run_docker_test "alpine-multi-shell" "Alpine Linux with sh, bash, dash, zsh, fish"
record_result "Alpine Multi-Shell" $?

# Test 2: Debian with various shells
run_docker_test "debian-shells" "Debian with bash, dash, zsh, ksh, fish, tcsh"
record_result "Debian Shells" $?

# Test 3: Restricted permissions
run_docker_test "ubuntu-restricted" "Ubuntu with non-root user (limited permissions)"
record_result "Restricted Permissions" $?

# Test 4: Minimal shell environment
run_docker_test "minimal-shell" "Minimal environment (sh only, no bash)"
record_result "Minimal Shell" $?

# Test 5: Locale testing
run_docker_test "locale-testing" "Different locale settings (UTF-8, Japanese, German, C)"
record_result "Locale Testing" $?

# Test 6: CI/CD simulation
run_docker_test "ci-simulation" "CI/CD environment (non-interactive, no TTY)"
record_result "CI Simulation" $?

# Print summary
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
for test in "${TESTS[@]}"; do
    if [[ $test == ✓* ]]; then
        echo -e "${GREEN}$test${NC}"
    else
        echo -e "${RED}$test${NC}"
    fi
done
echo ""
echo -e "Total: $((PASSED + FAILED)) tests"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

# Exit with failure if any tests failed
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
