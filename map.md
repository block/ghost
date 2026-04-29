---
schema: ghost.map/v1
id: ghost
repo: block/ghost
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 580, share: 0.78 }
  - { name: markdown, files: 70, share: 0.09 }
  - { name: css, files: 35, share: 0.05 }
  - { name: json, files: 30, share: 0.04 }
  - { name: javascript, files: 25, share: 0.03 }
build_system: pnpm
package_manifests:
  - package.json
  - pnpm-workspace.yaml
composition:
  frameworks:
    - { name: react, version: "19" }
    - { name: vite }
    - { name: vitest }
    - { name: cac }
  rendering: react
  styling:
    - tailwind
    - css-vars
  navigation: file-based-mdx
registry:
  path: packages/ghost-ui/registry.json
  components: 97
design_system:
  paths:
    - packages/ghost-ui/src/components
    - packages/ghost-ui/src/styles
    - packages/ghost-ui/src/lib
  entry_files:
    - packages/ghost-ui/src/styles/tokens.css
    - packages/ghost-ui/registry.json
    - packages/ghost-ui/expression.md
  status: active
ui_surface:
  include:
    - packages/ghost-ui/src/components/**
    - apps/docs/src/**
  exclude:
    - "**/dist/**"
    - "**/node_modules/**"
    - "**/test/**"
    - "**/*.test.ts"
    - packages/ghost-ui/scripts/**
    - packages/*/dist/**
feature_areas:
  - name: ghost-drift
    paths:
      - packages/ghost-drift/src/core
      - packages/ghost-drift/src/cli.ts
      - packages/ghost-drift/src/skill-bundle
    sub_areas:
      - compare
      - expression
      - evolution
      - reporters
  - name: ghost-map
    paths:
      - packages/ghost-map/src/core
      - packages/ghost-map/src/cli.ts
    sub_areas:
      - inventory
      - lint
  - name: ghost-ui-components
    paths:
      - packages/ghost-ui/src/components
    sub_areas:
      - primitives
      - ai-elements
  - name: ghost-ui-mcp
    paths:
      - packages/ghost-ui/src/mcp
  - name: docs-site
    paths:
      - apps/docs/src
    sub_areas:
      - drift
      - design-language
      - catalogue
orientation_files:
  - README.md
  - CLAUDE.md
  - INVARIANTS.md
  - docs/expression-format.md
  - docs/ideas/phase-0-decisions.md
---

## Identity

Ghost is a TypeScript pnpm monorepo that helps agents detect and manage
visual-language drift in the design systems they generate against. The
canonical artifact is `expression.md` — a human-readable, LLM-editable
Markdown file with a YAML machine layer plus a three-section prose body.
Ghost is BYOA: judgement work (profile, review, verify, generate, discover)
lives in skill recipes the host agent executes; the CLIs are the calculator
the agent reaches for when it needs a reproducible answer.

The repository is in the middle of a five-tool decomposition. Today
`ghost-drift` is the only published package; alongside it sit `ghost-ui`
(private reference component library, distributed via shadcn registry) and
`apps/docs` (the deployed docs site). The `ghost-map` package — the source
of this map.md — is being bootstrapped here as the first phase of that
decomposition; future phases extract `@ghost/core`, `ghost-expression`,
and `ghost-fleet` as siblings.

## Topology

The design system lives in `packages/ghost-ui/src`. Tokens resolve through
`src/styles/tokens.css` (the canonical CSS variable layer) and the shadcn
`registry.json` describes the 97 components shipped to consumers. The
expression.md at `packages/ghost-ui/expression.md` is the authoritative
language description; `embedding.md` carries the precomputed 49-dim vector.

Customer UI lives in two places. The reference primitives under
`packages/ghost-ui/src/components` are the catalogue tools index, and the
docs site under `apps/docs/src` consumes them as a live showcase. Excludes
are the standard monorepo noise (`dist/`, `node_modules/`) plus the
`packages/ghost-ui/scripts/` build harness, which generates the registry
but is not itself customer-visible.

Feature surfaces follow the package boundaries because the repo is a
verb-decomposed CLI. `ghost-drift` is the engine that owns embedding,
comparison, expression parsing, evolution (track/ack/diverge), and the
existing skill bundle. `ghost-map` (this slice) ships only `inventory` and
`lint` today; `describe` and `emit skill` are deferred to a later
deliverable. `ghost-ui-components` is the registry surface; `ghost-ui-mcp`
is the MCP server re-exposing the registry to AI assistants.
`docs-site` consumes both of the above for the deployed marketing and
catalogue site.

Orientation reading order is `README.md` → `CLAUDE.md` (agent context) →
`INVARIANTS.md` (hard constraints — read before any non-trivial change) →
`docs/expression-format.md` (the canonical artifact spec) →
`docs/ideas/phase-0-decisions.md` (the decomposition plan that
contextualizes ghost-map's existence).

## Conventions

Each published package mirrors the same shape: `src/bin.ts` is the
shebang entry, `src/cli.ts` exposes a `buildCli()` builder, `src/core/`
holds the deterministic library surface, and tests live under
`test/` (with `test/fixtures/` for sample data — biome ignores fixtures).
Public exports flow through `src/core/index.ts` only; deep imports from
`./core/*` are not part of the contract.

Code style is enforced by Biome (`pnpm fmt`, `pnpm check`) with the lefthook
pre-commit hook running `biome format --write && biome check --fix && just
check`. Line-length budgets per file are enforced by
`scripts/check-file-sizes.mjs` (default 500, narrow exceptions inline).
TypeScript is strict everywhere with project references — every package
ships its own `tsconfig.json` extending the root.

Skill bundles live in `src/skill-bundle/` per package. Each carries its own
`SKILL.md` plus `references/`. Cross-recipe references happen through verb
names in prose, not through a meta-emit step. Vitest is the test runner;
tests are colocated under each package's `test/` directory.
