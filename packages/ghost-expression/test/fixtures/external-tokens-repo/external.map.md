---
schema: ghost.map/v1
id: external-tokens-fixture
repo: example/external-tokens
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 14, share: 1 }
build_system: pnpm
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
  upstream: "@example/design-tokens"
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

A consumer of upstream tokens — `@example/design-tokens` is the source of truth, and this repo only checks in the generated `tokens.css`.

## Topology

Tokens flow from the upstream package through a build step into `src/styles/tokens.css`. Components reference Tailwind utilities; the upstream package owns palette/spacing/surfaces.

## Conventions

- Never edit `src/styles/tokens.css` by hand — regenerate from `@example/design-tokens`
