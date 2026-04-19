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

# Run docs dev server (drift tooling docs)
dev-docs:
    pnpm -F @ghost/docs dev

# Build catalogue (static export)
build-ui:
    pnpm -F @ghost/catalogue build

# Build docs (static VitePress export)
build-docs:
    pnpm -F @ghost/docs build

# Build @ghost/ui library (dist-lib + types)
build-lib:
    pnpm -F @ghost/ui build:lib

# Build ghost-ui shadcn registry
build-registry:
    pnpm -F @ghost/ui build:registry

# Build catalogue + docs into unified dist/ for GitHub Pages
build-pages:
    DEPLOY_BASE="/ghost/" pnpm -F @ghost/catalogue build
    DEPLOY_BASE="/ghost/" pnpm -F @ghost/docs build
    rm -rf dist
    mkdir -p dist
    cp -r apps/catalogue/dist/. dist/
    cp dist/index.html dist/404.html
    cp -r apps/docs/.vitepress/dist dist/docs

# ── Utilities ────────────────────────────────────────────────

# Clean build artifacts
clean:
    pnpm clean
    rm -rf node_modules packages/*/node_modules
