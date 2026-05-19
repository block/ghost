---
schema: ghost.map/v2
id: ghost
repo: block/ghost
mapped_at: 2026-05-18
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
    - packages/ghost-ui/fingerprint.md
  status: active
surface_sources:
  render_strategy: static-source
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
  - name: ghost-cli-package
    paths:
      - packages/ghost/src/cli.ts
      - packages/ghost/src/scan-commands.ts
      - packages/ghost/src/skill-command.ts
      - packages/ghost/src/skill-bundle
    sub_areas:
      - scan
      - review
      - compare
      - stance
      - skill-install
  - name: ghost-shared-core
    paths:
      - packages/ghost/src/ghost-core
      - packages/ghost/src/core
      - packages/ghost/src/scan
    sub_areas:
      - schemas
      - fingerprint
      - survey
      - checks
      - memory
      - embedding
  - name: ghost-fleet
    paths:
      - packages/ghost-fleet/src
    sub_areas:
      - members
      - view
      - fleet-skill
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
      - cli-reference
      - design-language
      - catalogue
orientation_files:
  - README.md
  - CLAUDE.md
  - docs/fingerprint-format.md
  - docs/generation-loop.md
---

## Identity

Ghost is a TypeScript pnpm monorepo that gives AI agents repo-local design and
product-experience memory. The public npm package is
`@anarchitecture/ghost`, and its only user-facing bin is `ghost`.

The canonical artifact is the root `.ghost/` bundle: `resources.yml` declares
what to read, `map.md` routes repo topology, `survey.json` records observed
design evidence, and `patterns.yml` turns repeated composition into a grammar.
Optional `checks.yml`, `intent.md`, `decisions/*.yml`, and `proposals/*.yml`
carry enforcement and product-experience memory.

Ghost is BYOA. The host agent performs the reading, judgement, and authoring.
The CLI validates schemas, computes deterministic transforms, compares
fingerprints, checks diffs, emits review packets, and installs the unified
`ghost` skill bundle.

## Topology

The publishable package lives in `packages/ghost`. It folds the previous drift,
scan, and shared-core runtime into one npm-safe package with no `workspace:*`
runtime dependencies. Its public exports are split by subpath:
`@anarchitecture/ghost`, `/scan`, `/drift`, `/core`, and `/cli`.

`packages/ghost-fleet` remains private and consumes workspace exports from
`@anarchitecture/ghost`. `packages/ghost-ui` is the reference component
library and MCP server. `apps/docs` is the deployed documentation site and
renders CLI help from the generated manifest.

The design system lives in `packages/ghost-ui/src`. Tokens resolve through
`src/styles/tokens.css`, and the shadcn `registry.json` describes the 97
components shipped to consumers.

## Conventions

Each package keeps the standard shape: `src/bin.ts` for the shebang entry,
`src/cli.ts` for the `buildCli()` builder when it has a CLI, `src/core/` for
deterministic library code, `src/skill-bundle/` for agent recipes, and `test/`
for vitest coverage.

For the public package, keep npm runtime code under `packages/ghost/src`.
Private historical packages may remain in the workspace, but the packed
`@anarchitecture/ghost` artifact must not reference `@ghost/core`,
`ghost-scan`, `ghost-drift`, or any `workspace:*` dependency.
