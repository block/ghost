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

# Run catalogue dev server (design language showcase)
dev:
    pnpm -F @ghost/catalogue dev

# Build catalogue (static export)
build-ui:
    pnpm -F @ghost/catalogue build

# Build @ghost/ui library (dist-lib + types)
build-lib:
    pnpm -F @ghost/ui build:lib

# Build ghost-ui shadcn registry
build-registry:
    pnpm -F @ghost/ui build:registry

# ── Utilities ────────────────────────────────────────────────

# Clean build artifacts
clean:
    pnpm clean
    rm -rf node_modules packages/*/node_modules
