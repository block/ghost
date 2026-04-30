---
schema: ghost.map/v1
id: derived-tokens-fixture
repo: example/derived-tokens
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 22, share: 1 }
build_system: [pnpm, style-dictionary]
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react-dom
  styling:
    - css-custom-properties
design_system:
  paths:
    - tokens
    - dist/tokens
  entry_files:
    - tokens/colors.json
    - tokens/spacing.json
  derived_files:
    - dist/tokens/colors.ts
    - dist/tokens/spacing.css
  token_source: inline
  status: active
ui_surface:
  include:
    - "src/**"
  exclude:
    - "dist/**"
feature_areas:
  - name: ui
    paths: ["src/ui"]
orientation_files:
  - README.md
---

## Identity

Token pipeline that ships both source and built artifacts — Style Dictionary consumes `tokens/*.json` and emits `dist/tokens/*.{ts,css}` consumers reference at runtime.

## Topology

`tokens/` is the source-of-truth layer; `dist/tokens/` is the build output other tools read. Both are checked in so downstream consumers can pin to a SHA without running the build.

## Conventions

- Source tokens live in `tokens/`
- Generated tokens live in `dist/tokens/` and are committed
