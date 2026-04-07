# Default recipe
default:
    @just --list

# ── Dev Environment ──────────────────────────────────────────

# Install dependencies
setup:
    pnpm install

# ── Build & Check ────────────────────────────────────────────

# Run all checks (lint, format, typecheck, file sizes)
check:
    pnpm check

# Format code
fmt:
    pnpm fmt

# Check formatting without modifying
fmt-check:
    pnpm exec biome format .

# Build all packages
build:
    pnpm build

# Full CI gate
ci: check test build

# ── Test ─────────────────────────────────────────────────────

# Run unit tests
test:
    pnpm test

# Run tests in watch mode
test-watch:
    pnpm test:watch

# ── Run ──────────────────────────────────────────────────────

# Run ghost-ui catalogue dev server
dev:
    cd packages/ghost-ui && pnpm dev

# Build ghost-ui catalogue (static export)
build-ui:
    cd packages/ghost-ui && pnpm build

# Build ghost-ui shadcn registry
build-registry:
    cd packages/ghost-ui && pnpm build:registry

# ── Utilities ────────────────────────────────────────────────

# Clean build artifacts
clean:
    pnpm clean
    rm -rf node_modules packages/*/node_modules
