---
schema: ghost.map/v1
id: managerbot
repo: squareup/square-web
subject:
  id: managerbot
  target: squareup/square-web/apps/managerbot
sources:
  - id: managerbot
    role: primary
    target: squareup/square-web/apps/managerbot
    paths:
      - apps/managerbot/managerbot-web
      - apps/managerbot/managerbot-storybook
      - apps/managerbot/docs
  - id: managerbot-ui
    role: resolver
    target: squareup/square-web/libs/managerbot/managerbot-ui
    resolves: [color, spacing, typography, radius, shadow, motion, components]
    paths:
      - libs/managerbot/managerbot-ui
mapped_at: 2026-05-04
platform: web
languages:
  - { name: typescript, files: 3703, share: 0.908 }
  - { name: json, files: 209, share: 0.051 }
  - { name: markdown, files: 88, share: 0.022 }
  - { name: yaml, files: 62, share: 0.015 }
  - { name: javascript, files: 8, share: 0.002 }
  - { name: css, files: 6, share: 0.001 }
  - { name: shell, files: 4, share: 0.001 }
build_system: [nx, vite, pnpm]
package_manifests:
  - apps/managerbot/managerbot-web/package.json
  - apps/managerbot/managerbot-storybook/package.json
  - apps/managerbot/managerbot-mcp/package.json
  - apps/managerbot/managerbot-eval/package.json
  - apps/managerbot/managerbot-e2e/package.json
  - apps/managerbot/libs/ai-sdk-kgoose-provider/package.json
  - libs/managerbot/managerbot-ai-server-tools/package.json
  - libs/managerbot/managerbot-arazzo-engine/package.json
  - libs/managerbot/managerbot-bff/package.json
  - libs/managerbot/managerbot-kgoose/package.json
  - libs/managerbot/managerbot-schemas/package.json
  - libs/managerbot/managerbot-types-protos/package.json
  - libs/managerbot/managerbot-ui/package.json
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
    - libs/managerbot/managerbot-ui/src/components
    - libs/managerbot/managerbot-ui/src/components/ai-elements
    - libs/managerbot/managerbot-ui/src/styles
    - libs/managerbot/managerbot-ui/src/hooks
    - libs/managerbot/managerbot-ui/src/utils
  entry_files:
    - libs/managerbot/managerbot-ui/components.json
    - libs/managerbot/managerbot-ui/src/styles/globals.css
    - libs/managerbot/managerbot-ui/src/styles/theme.css
    - libs/managerbot/managerbot-ui/package.json
  token_source: mixed
  upstream:
    - libs/managerbot/managerbot-ui
    - "@squareup/market-react"
  status: active
surface_sources:
  render_strategy: static-source
  include:
    - libs/managerbot/managerbot-ui/src/components/**
    - libs/managerbot/managerbot-ui/src/styles/**
    - libs/managerbot/managerbot-ui/src/hooks/**
    - apps/managerbot/managerbot-web/src/components/**
    - apps/managerbot/managerbot-web/src/routes/**
    - apps/managerbot/managerbot-storybook/**
  exclude:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/*.spec.ts"
    - "**/*.spec.tsx"
    - "**/*.stories.tsx"
    - libs/managerbot/managerbot-ui/src/components/visx-charts/**
    - libs/managerbot/managerbot-ui/src/components/rjsf/**
    - apps/managerbot/managerbot-e2e/**
    - apps/managerbot/managerbot-eval/**
feature_areas:
  - name: ui-primitives
    paths:
      - libs/managerbot/managerbot-ui/src/components
    sub_areas:
      - shadcn-shell
      - form-controls
      - overlays
      - layout
  - name: ai-elements
    paths:
      - libs/managerbot/managerbot-ui/src/components/ai-elements
    sub_areas:
      - conversation
      - prompt-input
      - reasoning
      - artifact
      - canvas
      - tool
  - name: charts
    paths:
      - libs/managerbot/managerbot-ui/src/components/visx-charts
  - name: web-app
    paths:
      - apps/managerbot/managerbot-web/src/routes
      - apps/managerbot/managerbot-web/src/components
    sub_areas:
      - chat-conversation
      - tasks
      - pulse
      - insights
      - settings
  - name: storybook
    paths:
      - apps/managerbot/managerbot-storybook
  - name: design-tokens
    paths:
      - libs/managerbot/managerbot-ui/src/styles
orientation_files:
  - apps/managerbot/README.md
  - apps/managerbot/AGENTS.md
  - apps/managerbot/managerbot-web/AGENTS.md
  - libs/managerbot/managerbot-ui/AGENTS.md
  - libs/managerbot/managerbot-ui/components.json
  - libs/managerbot/managerbot-ui/src/styles/theme.css
  - libs/managerbot/managerbot-ui/package.json
---

## Identity

Managerbot is the TypeScript codebase behind go/managerbot — Square's
AI-powered seller assistant. It is one app within the larger `square-web`
Nx + pnpm monorepo, co-locating a React Router web app, an MCP server, a
shared UI library, evals, e2e tests, and a Storybook into a single
deploy unit. Sellers interact with it as a chat surface that drives
LLM-mediated tools against Square's APIs.

## Topology

The design system lives in `libs/managerbot/managerbot-ui` — a workspace package
(`@squareup/managerbot-ui`) consumed by `apps/managerbot/managerbot-web`. It is a
shadcn-flavored library: 130-plus primitive components plus an
`ai-elements/` sub-tree of LLM chat surfaces (conversation, prompt-input,
reasoning, artifact, canvas, tool) sourced from the
`registry.ai-sdk.dev` registry. Tokens are inline in
`src/styles/theme.css`, layered under `globals.css`. Charts use visx,
forms use react-hook-form + rjsf, motion is `motion`/framer-motion.

Customer-facing UI lives in two places. The shared library is the
catalogue (also showcased in `apps/managerbot/managerbot-storybook`), and
`apps/managerbot/managerbot-web/src` is the consuming app — its `routes/`
tree (insights, tasks, pulse, session, settings, labs, panels) and
`components/` tree (chat-conversation, tools, tasks-popover,
pinned-widgets, pages) wire primitives into product surfaces.

Excludes follow the usual monorepo noise (`node_modules`, `dist`) plus
test artifacts (`*.spec.tsx`, `*.stories.tsx`, `managerbot-e2e`,
`managerbot-eval`) and library wrappers that are secondary to the core
fingerprint (`visx-charts`, `rjsf`).

## Conventions

The repo uses pnpm catalog protocol (`catalog:managerbot`) to pin shared
dependencies across the monorepo, and Nx targets to orchestrate builds
(`nx run managerbot:dev`, `:build`, `:test:e2e`). The UI library exposes
its surface via package `exports` rather than a shadcn `registry.json`
— `components.json` configures style "new-york", `baseColor: neutral`,
Lucide icons, and a single external registry alias (`@ai-elements`).

Theme tokens follow Tailwind 4's `@theme inline` pattern: raw color
ramps scoped under `.managerbot-ui-root`, a monochrome semantic layer
(`--background`/`--foreground`/`--primary`/...) defined twice for light
and `.dark`, and a `force-light` utility for forced color modes. The
font stack is "Cash Sans" (loaded from `cash-f.squarecdn.com`) over the
system sans fallback. Color ramps are oklch and span 18 stops from 50
to 950 in custom +50 increments (`30/50/80/100/150/200/...`). Brand
hooks (`cashapp-*`, `square-*`) sit alongside the neutral/red/yellow/
green/blue/purple core families, and Tailwind's full extended palette
(slate/gray/zinc/stone/rose/orange/amber/lime/emerald/teal/cyan/sky/
indigo/violet/fuchsia/pink) is preserved for chart use.

Orientation reading order is `apps/managerbot/README.md` (architecture
overview) → `apps/managerbot/AGENTS.md` (agent context) →
`libs/managerbot/managerbot-ui/components.json` (shadcn config) →
`libs/managerbot/managerbot-ui/src/styles/theme.css` (the canonical token
layer) → `libs/managerbot/managerbot-ui/package.json` (dependency
footprint).
