---
schema: ghost.map/v1
id: ghost-ui
repo: block/ghost
subject:
  id: ghost-ui
  target: block/ghost@packages/ghost-ui
sources:
  - id: ghost-ui
    role: primary
    target: block/ghost@packages/ghost-ui
    paths:
      - packages/ghost-ui
mapped_at: 2026-05-01
platform: web
languages:
  - { name: typescript, files: 116, share: 0.468 }
  - { name: json, files: 114, share: 0.46 }
  - { name: markdown, files: 10, share: 0.04 }
  - { name: css, files: 4, share: 0.016 }
  - { name: javascript, files: 4, share: 0.016 }
build_system: pnpm
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react, version: "19.1.0" }
    - { name: vite, version: "^6.3.0" }
    - { name: tailwindcss, version: "^4.2.2" }
    - { name: shadcn, version: "4.3.0" }
  rendering: react-spa
  styling:
    - tailwindcss-v4
    - css-custom-properties
  navigation: react-router
registry:
  path: registry.json
  components: 106
design_system:
  paths:
    - src/styles
    - src/components/ui
    - src/components/ai-elements
    - src/components/theme
    - src/lib
  entry_files:
    - src/styles/main.css
    - src/styles/font-faces.css
    - src/lib/theme-defaults.ts
    - src/lib/theme-presets.ts
    - src/lib/theme-utils.ts
    - src/components/theme/ThemeProvider.tsx
  token_source: inline
  status: active
surface_sources:
  render_strategy: static-source
  include:
    - src/components/ui/**
    - src/components/ai-elements/**
    - src/components/theme/**
    - src/styles/**
    - src/lib/theme-*.ts
  exclude:
    - src/mcp/**
    - scripts/**
    - dist/**
    - dist-lib/**
    - dist-mcp/**
    - test/**
    - "**/*.test.ts"
    - "**/*.test.tsx"
feature_areas:
  - name: ui-primitives
    paths:
      - src/components/ui
    sub_areas: [input, layout, feedback, display, navigation, overlay]
  - name: ai-elements
    paths:
      - src/components/ai-elements
    sub_areas: [chat, agent-state, artifacts, terminal, media]
  - name: theme-controls
    paths:
      - src/components/theme
      - src/lib/theme-defaults.ts
      - src/lib/theme-presets.ts
      - src/lib/theme-utils.ts
    sub_areas: [runtime-presets, css-variable-injection]
  - name: tokens
    paths:
      - src/styles
    sub_areas: [colors, typography, radius, shadows, motion, spacing]
  - name: hooks
    paths:
      - src/hooks
    sub_areas: [scroll-reveal, mobile, text-animation]
orientation_files:
  - package.json
  - registry.json
  - components.json
  - src/styles/main.css
  - src/styles/font-faces.css
  - src/lib/theme-defaults.ts
  - src/lib/theme-presets.ts
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ai-elements/message.tsx
---

## Identity

`ghost-ui` is the reusable React component and theme package inside the Ghost repo. It publishes a shadcn-compatible registry, a CSS token surface, and an MCP server for exposing the registry to agents.

## Topology

The design system is colocated in `packages/ghost-ui`: canonical tokens live in `src/styles/main.css` plus theme helper files in `src/lib`, while component surfaces live under `src/components/ui`, `src/components/ai-elements`, and `src/components/theme`. The registry enumerates the distributable component set and is the strongest component-count signal.

## Conventions

Styling is Tailwind v4 driven by CSS custom properties: raw constants and semantic tokens cascade into `@theme inline` aliases consumed by components. Runtime presets override the same CSS variables rather than branching component code, so the scan should treat tokens and component usage together.
