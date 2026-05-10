---
schema: ghost.map/v2
id: ghost
repo: block/ghost
subject:
  id: ghost
  target: github:block/ghost
sources:
  - id: ghost
    role: primary
    target: github:block/ghost
    paths:
      - .
  - id: ghost-ui
    role: resolver
    target: github:block/ghost
    resolves:
      - color
      - spacing
      - typography
      - radius
      - shadow
      - component
    paths:
      - packages/ghost-ui/src
      - packages/ghost-ui/registry.json
mapped_at: 2026-05-10
platform: web
languages:
  - { name: typescript, files: 453, share: 0.60 }
  - { name: json, files: 160, share: 0.21 }
  - { name: markdown, files: 92, share: 0.12 }
  - { name: javascript, files: 18, share: 0.02 }
  - { name: css, files: 10, share: 0.01 }
  - { name: yaml, files: 5, share: 0.01 }
build_system:
  - pnpm
  - vite
  - nx
package_manifests:
  - package.json
  - apps/docs/package.json
  - packages/ghost-core/package.json
  - packages/ghost-drift/package.json
  - packages/ghost-fingerprint/package.json
  - packages/ghost-fleet/package.json
  - packages/ghost-ui/package.json
composition:
  frameworks:
    - { name: react, version: "19" }
    - { name: vite }
    - { name: vitest }
    - { name: cac }
  rendering: react-spa
  styling:
    - tailwind-v4
    - css-vars
  navigation: react-router-file-routes
registry:
  path: packages/ghost-ui/registry.json
  components: 97
design_system:
  paths:
    - packages/ghost-ui/src/components
    - packages/ghost-ui/src/styles
    - packages/ghost-ui/src/lib
  entry_files:
    - packages/ghost-ui/src/styles/main.css
    - packages/ghost-ui/src/lib/theme-defaults.ts
    - packages/ghost-ui/registry.json
  derived_files:
    - packages/ghost-ui/public/r/registry.json
    - packages/ghost-ui/dist-lib/r/registry.json
  token_source: inline
  status: active
surface_sources:
  render_strategy: docs
  include:
    - packages/ghost-ui/src/components/**
    - apps/docs/src/app/**
    - apps/docs/src/components/docs/**
    - apps/docs/src/components/theme-panel/**
  exclude:
    - "**/dist/**"
    - "**/dist-lib/**"
    - "**/node_modules/**"
    - "**/test/**"
    - "**/*.test.ts"
  coverage_gaps:
    - Docs routes are source-observed in this dogfood pass; rendered browser screenshots are a later verification pass.
feature_areas:
  - name: root-fingerprint-package
    paths:
      - .ghost
      - packages/ghost-fingerprint/src/core/fingerprint-package.ts
      - packages/ghost-fingerprint/src/core/verify-package.ts
    sub_areas:
      - resources
      - map
      - survey
      - patterns
      - checks
  - name: ghost-fingerprint-cli
    paths:
      - packages/ghost-fingerprint/src/cli.ts
      - packages/ghost-fingerprint/src/skill-bundle
    sub_areas:
      - inventory
      - lint
      - scan-status
      - survey-ops
      - emit
  - name: ghost-drift
    paths:
      - packages/ghost-drift/src
    sub_areas:
      - compare
      - check
      - review
      - evolution
  - name: ghost-fleet
    paths:
      - packages/ghost-fleet/src
    sub_areas:
      - members
      - view
      - fleet-narrative
  - name: ghost-ui
    paths:
      - packages/ghost-ui/src/components
      - packages/ghost-ui/src/styles
      - packages/ghost-ui/src/lib
    sub_areas:
      - primitives
      - ai-elements
      - theme
      - registry
  - name: docs-site
    paths:
      - apps/docs/src
    sub_areas:
      - home
      - tools
      - foundations
      - component-catalogue
      - theme-panel
scopes:
  - id: root-fingerprint-package
    name: Root fingerprint package
    kind: design-memory
    paths:
      - .ghost
      - packages/ghost-fingerprint/src/core/fingerprint-package.ts
      - packages/ghost-fingerprint/src/core/verify-package.ts
  - id: ghost-fingerprint-cli
    name: Ghost Fingerprint CLI
    kind: cli-tool
    paths:
      - packages/ghost-fingerprint/src/cli.ts
      - packages/ghost-fingerprint/src/skill-bundle
  - id: ghost-drift
    name: Ghost Drift
    kind: cli-tool
    paths:
      - packages/ghost-drift/src
  - id: ghost-fleet
    name: Ghost Fleet
    kind: cli-tool
    paths:
      - packages/ghost-fleet/src
  - id: ghost-core
    name: Ghost Core
    kind: library
    paths:
      - packages/ghost-core/src
  - id: ghost-ui-components
    name: Ghost UI Components
    kind: design-system
    paths:
      - packages/ghost-ui/src/components
  - id: ghost-ui-theme
    name: Ghost UI Theme
    kind: token-system
    paths:
      - packages/ghost-ui/src/styles
      - packages/ghost-ui/src/lib/theme-defaults.ts
      - packages/ghost-ui/src/lib/theme-presets.ts
      - packages/ghost-ui/src/lib/theme-utils.ts
  - id: docs-site
    name: Docs Site
    kind: product-surface
    paths:
      - apps/docs/src
orientation_files:
  - README.md
  - CLAUDE.md
  - docs/fingerprint-format.md
  - packages/ghost-fingerprint/README.md
  - packages/ghost-fingerprint/src/skill-bundle/references/schema.md
---

## Identity

Ghost is a TypeScript pnpm monorepo for repository-local design memory:
agents use the fingerprint package to preserve a product's design identity
while generating, reviewing, and verifying UI. The current shape is a root
`.ghost/` bundle, not a single fingerprint markdown file; the package separates
resource references, topology, observed evidence, operational patterns,
deterministic checks, and optional human intent.

## Topology

The design system lives in `packages/ghost-ui`, where `src/styles/main.css`
and `src/lib/theme-defaults.ts` define the token layer and
`registry.json` enumerates 97 shipped UI components. The docs app under
`apps/docs/src` is the main rendered surface: it hosts product pages,
foundation pages, component catalogue pages, AI element demos, and the theme
panel used to exercise the design system.

The tool packages split by responsibility: `@ghost/core` owns shared schemas
and primitives, `ghost-fingerprint` owns the root package scan, `ghost-drift`
owns drift checking and evolution, and `ghost-fleet` owns multi-member fleet
narrative. The root `.ghost/` bundle is intentionally inside the repo so the
tools can dogfood their own artifact boundaries.

## Conventions

Code follows the package pattern `src/bin.ts`, `src/cli.ts`, `src/core/`, and
`test/`, with public library exports flowing through each package's core index.
The UI layer is Tailwind v4 plus CSS variables, with a monochrome-first palette,
pill-oriented controls, large editorial display type in docs, and a shadcn
registry for distribution. Checks should stay deterministic and scoped through
map scopes; judgment and product direction belong in `patterns.yml` and
`intent.md`, not in survey rows.
