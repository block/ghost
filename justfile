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

# Build the ghost package
build:
    pnpm build

# Full quality gate
ci:
    pnpm run quality:all

# ── Test ─────────────────────────────────────────────────────

# Run unit tests
test:
    pnpm test

# Run tests in watch mode
test-watch:
    pnpm test:watch

# ── Docs ─────────────────────────────────────────────────────

# Run the thesis site and development log
docs-dev:
    pnpm --filter ghost-docs --fail-if-no-match dev

# Build the docs site
docs-build:
    pnpm --filter ghost-docs --fail-if-no-match build

# Build the docs site for GitHub Pages (base=/ghost/)
docs-pages:
    DEPLOY_BASE="/ghost/" pnpm --filter ghost-docs --fail-if-no-match build
    rm -rf dist
    mkdir -p dist
    cp -r apps/docs/dist/. dist/

# ── Vessel ───────────────────────────────────────────────────

# Build the Vessel library and types
vessel-build:
    pnpm --filter @design-intelligence/vessel-react --fail-if-no-match build

# Build the Vessel shadcn registry
vessel-registry:
    pnpm --filter @design-intelligence/vessel-react --fail-if-no-match build:registry

# ── Utilities ────────────────────────────────────────────────

# Clean build artifacts
clean:
    pnpm clean
    rm -rf node_modules packages/*/node_modules
