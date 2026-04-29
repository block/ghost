---
schema: ghost.map/v1
id: multi-upstream-fixture
repo: example/multi-upstream
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 14, share: 1 }
build_system: [pnpm, vite]
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react-dom
  styling:
    - tailwindcss-v4
design_system:
  paths:
    - src/components
  derived_files:
    - src/styles/tokens.css
  token_source: external
  upstream:
    - "@example/design-tokens"
    - "@example/design-components"
    - "@example/design-icons"
    - "@example/design-glue"
  status: active
ui_surface:
  include:
    - "src/components/**"
  exclude:
    - "dist/**"
feature_areas:
  - name: app-ui
    paths: ["src/components"]
orientation_files:
  - README.md
---

## Identity

A consumer of multiple upstream packages — tokens, components, icons, and the glue between them are each their own published artifact.

## Topology

Each upstream package contributes a different layer: `@example/design-tokens` ships the primitive token CSS, `@example/design-components` ships the React primitives, `@example/design-icons` ships the icon set, and `@example/design-glue` ships the consumer-facing wrappers and theme bindings.

## Conventions

- Never edit `src/styles/tokens.css` by hand — it's regenerated from `@example/design-tokens`.
- Wrappers in `src/components/**` import from `@example/design-glue`, never from the underlying `@example/design-components` directly.
