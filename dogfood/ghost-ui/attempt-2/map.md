---
schema: ghost.map/v1
id: ghost-ui
repo: block/ghost
mapped_at: 2026-04-29
platform: web
languages:
  - { name: typescript, files: 116, share: 0.4696 }
  - { name: json, files: 113, share: 0.4575 }
  - { name: markdown, files: 10, share: 0.0405 }
  - { name: css, files: 4, share: 0.0162 }
  - { name: javascript, files: 4, share: 0.0162 }
build_system: [pnpm, vite]
package_manifests:
  - package.json
  - tsconfig.json
  - tsconfig.lib.json
  - tsconfig.mcp.json
  - vite.lib.config.ts
  - components.json
composition:
  frameworks:
    - { name: react, version: "19.1.0" }
    - { name: vite, version: "^6.3.0" }
    - { name: tailwindcss, version: "^4.2.2" }
    - { name: radix-ui }
    - { name: lucide-react, version: "^1.7.0" }
    - { name: cmdk, version: "^1.1.1" }
    - { name: sonner, version: "^2.0.7" }
    - { name: class-variance-authority, version: "^0.7.1" }
  rendering: react-spa
  styling:
    - tailwindcss-v4
    - css-custom-properties
registry:
  path: ./registry.json
  components: 106
design_system:
  paths:
    - src/styles
    - src/components/theme
    - src/lib
  entry_files:
    - src/styles/main.css
    - src/styles/font-faces.css
    - src/lib/theme-presets.ts
    - src/lib/theme-defaults.ts
    - src/lib/theme-utils.ts
    - src/lib/theme-provider.tsx
  token_source: inline
  status: active
ui_surface:
  include:
    - "src/components/ui/**"
    - "src/components/ai-elements/**"
    - "src/components/theme/**"
    - "src/styles/**"
    - "src/lib/theme-*"
  exclude:
    - "src/mcp/**"
    - "scripts/**"
    - "dist/**"
    - "dist-lib/**"
    - "dist-mcp/**"
    - "public/r/**"
    - "**/*.test.ts"
    - "**/*.test.tsx"
feature_areas:
  - name: ui-primitives
    paths: ["src/components/ui"]
    sub_areas: [input, layout, feedback, display, navigation, overlay]
  - name: ai-elements
    paths: ["src/components/ai-elements"]
    sub_areas: [chat, agent-state, artifacts, audio]
  - name: theme
    paths: ["src/components/theme", "src/lib/theme-presets.ts", "src/lib/theme-defaults.ts", "src/lib/theme-utils.ts", "src/lib/theme-provider.tsx"]
  - name: tokens
    paths: ["src/styles"]
  - name: hooks
    paths: ["src/hooks"]
  - name: registry-tooling
    paths: ["scripts", "registry.json", "components.json"]
  - name: mcp-server
    paths: ["src/mcp"]
orientation_files:
  - README.md
  - registry.json
  - src/styles/main.css
  - src/lib/theme-presets.ts
  - src/lib/theme-defaults.ts
---

## Identity

`ghost-ui` is a private workspace package in the `block/ghost` monorepo. It ships a reference design system — 49 shadcn-style UI primitives plus 48 AI-element components plus a theme layer — distributed via a shadcn `registry.json` rather than npm. It also ships an MCP server (`ghost-mcp` bin) that re-exposes the registry to AI assistants.

## Topology

The design system lives across three folders. Tokens are inline CSS custom properties declared in `src/styles/main.css` (Tailwind v4 `@theme` blocks plus `:root` and `.dark` variable layers). Theme presets and defaults are TypeScript modules under `src/lib/theme-*.ts`, surfaced through a `theme-provider.tsx` React context. UI primitives live under `src/components/ui/`; AI-specific elements (chat surfaces, agent-state indicators, artifacts) live under `src/components/ai-elements/`. The `registry.json` at the package root indexes 106 distributable items consumed by `shadcn build`.

## Conventions

Tailwind v4 with custom theming via `@theme` blocks, CSS custom properties for runtime token resolution, and a class-variance-authority pattern for variant-heavy primitives. Radix UI underlies most interactive primitives. Components are flat (no nested theme variants) and ship as both source files and a baked `registry.json` plus per-item snapshots under `public/r/` (113 JSON files account for the JSON-heavy histogram). Build splits into a Vite library bundle and a separate TypeScript-built MCP server.
