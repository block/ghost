---
schema: ghost.map/v1
id: managerbot
repo: squareup/square-web/apps/managerbot
mapped_at: 2026-04-30
platform: web
languages:
  - { name: typescript, files: 3614, share: 0.92 }
  - { name: json, files: 190, share: 0.05 }
  - { name: yaml, files: 59, share: 0.015 }
  - { name: markdown, files: 51, share: 0.013 }
  - { name: javascript, files: 10, share: 0.003 }
  - { name: css, files: 4, share: 0.001 }
  - { name: shell, files: 4, share: 0.001 }
build_system: [nx, vite, pnpm]
package_manifests:
  - libs/ai-sdk-kgoose-provider/package.json
  - libs/managerbot-ai-server-tools/package.json
  - libs/managerbot-arazzo-engine/package.json
  - libs/managerbot-bff/package.json
  - libs/managerbot-kgoose/package.json
  - libs/managerbot-schemas/package.json
  - libs/managerbot-types-protos/package.json
  - libs/managerbot-ui/package.json
composition:
  frameworks:
    - { name: react, version: "19" }
    - { name: react-router, version: "7" }
    - { name: vite }
    - { name: tailwindcss, version: "4" }
    - { name: base-ui-react }
    - { name: radix-ui }
    - { name: motion }
    - { name: vitest }
  rendering: react-router-ssr
  styling:
    - tailwindcss
    - css-vars
  navigation: react-router
design_system:
  paths:
    - libs/managerbot-ui/src/components
    - libs/managerbot-ui/src/components/ai-elements
    - libs/managerbot-ui/src/styles
    - libs/managerbot-ui/src/hooks
    - libs/managerbot-ui/src/utils
  entry_files:
    - libs/managerbot-ui/components.json
    - libs/managerbot-ui/src/styles/globals.css
    - libs/managerbot-ui/src/styles/theme.css
    - libs/managerbot-ui/package.json
  token_source: inline
  status: active
ui_surface:
  include:
    - libs/managerbot-ui/src/components/**
    - libs/managerbot-ui/src/styles/**
    - libs/managerbot-ui/src/hooks/**
    - managerbot-web/src/components/**
    - managerbot-web/src/routes/**
    - managerbot-storybook/**
  exclude:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/*.spec.ts"
    - "**/*.spec.tsx"
    - "**/*.stories.tsx"
    - libs/managerbot-ui/src/components/visx-charts/**
    - libs/managerbot-ui/src/components/rjsf/**
    - managerbot-e2e/**
    - managerbot-eval/**
feature_areas:
  - name: ui-primitives
    paths:
      - libs/managerbot-ui/src/components
    sub_areas:
      - shadcn-shell
      - form-controls
      - overlays
      - layout
  - name: ai-elements
    paths:
      - libs/managerbot-ui/src/components/ai-elements
    sub_areas:
      - conversation
      - prompt-input
      - reasoning
      - artifact
      - canvas
      - tool
  - name: charts
    paths:
      - libs/managerbot-ui/src/components/visx-charts
  - name: web-app
    paths:
      - managerbot-web/src/routes
      - managerbot-web/src/components
    sub_areas:
      - chat-conversation
      - tasks
      - pulse
      - insights
      - settings
  - name: storybook
    paths:
      - managerbot-storybook
  - name: design-tokens
    paths:
      - libs/managerbot-ui/src/styles
orientation_files:
  - README.md
  - CLAUDE.md
  - libs/managerbot-ui/components.json
  - libs/managerbot-ui/src/styles/theme.css
  - libs/managerbot-ui/package.json
---

## Identity

Managerbot is the TypeScript codebase behind go/managerbot — Square's
AI-powered seller assistant. It is one app within the larger `square-web`
Nx + pnpm monorepo, co-locating a React Router web app, an MCP server, a
shared UI library, evals, e2e tests, and a Storybook into a single
deploy unit. Sellers interact with it as a chat surface that drives
LLM-mediated tools against Square's APIs.

## Topology

The design system lives in `libs/managerbot-ui` — a workspace package
(`@squareup/managerbot-ui`) consumed by `managerbot-web`. It is a
shadcn-flavored library: 130-plus primitive components plus an
`ai-elements/` sub-tree of LLM chat surfaces (conversation, prompt-input,
reasoning, artifact, canvas, tool) sourced from the
`registry.ai-sdk.dev` registry. Tokens are inline in
`src/styles/theme.css`, layered under `globals.css`. Charts use visx,
forms use react-hook-form + rjsf, motion is `motion`/framer-motion.

Customer-facing UI lives in two places. The library is the catalogue
(also showcased in `managerbot-storybook`), and `managerbot-web/src` is
the consuming app — its `routes/` tree (insights, tasks, pulse, session,
settings, labs, panels) and `components/` tree (chat-conversation, tools,
tasks-popover, pinned-widgets, pages) wire primitives into product
surfaces.

Excludes follow the usual monorepo noise (`node_modules`, `dist`) plus
test artifacts (`*.spec.tsx`, `*.stories.tsx`, `managerbot-e2e`,
`managerbot-eval`) and library wrappers that aren't load-bearing for the
expression (`visx-charts`, `rjsf`).

## Conventions

The repo uses pnpm catalog protocol (`catalog:managerbot`) to pin shared
dependencies across the monorepo, and Nx targets to orchestrate builds
(`nx run managerbot:dev`, `:build`, `:test:e2e`). The UI library exposes
its surface via package `exports` rather than a shadcn `registry.json`
— `components.json` configures style "new-york", `baseColor: neutral`,
Lucide icons, and a single external registry alias (`@ai-elements`).

Theme tokens follow Tailwind 4's `@theme inline` pattern: raw color
ramps in `:root`, a monochrome semantic layer
(`--background`/`--foreground`/`--primary`/...) defined twice for light
and `.dark`, and a `force-light` utility for forced color modes. The
font stack is "Cash Sans" (loaded from `cash-f.squarecdn.com`) over the
system sans fallback. Color ramps are oklch and span 18 stops from 50
to 950 in custom +50 increments (`30/50/80/100/150/200/...`). Brand
hooks (`cashapp-*`, `square-*`) sit alongside the neutral/red/yellow/
green/blue/purple core families, and Tailwind's full extended palette
(slate/gray/zinc/stone/rose/orange/amber/lime/emerald/teal/cyan/sky/
indigo/violet/fuchsia/pink) is preserved for chart use.

Orientation reading order is `README.md` (architecture overview) →
`CLAUDE.md` (agent context) → `components.json` (shadcn config) →
`libs/managerbot-ui/src/styles/theme.css` (the canonical token layer)
→ `libs/managerbot-ui/package.json` (dependency footprint).
