---
schema: ghost.map/v1
id: fixture
repo: example/fixture
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 5, share: 1.0 }
build_system: pnpm
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react
  styling:
    - tailwind
design_system:
  paths:
    - src/components
  entry_files:
    - src/styles/tokens.css
  status: active
ui_surface:
  include:
    - src/components/**
  exclude:
    - "**/dist/**"
feature_areas:
  - name: catalogue
    paths:
      - src/components
orientation_files:
  - README.md
---

## Identity

A small fixture repo used to exercise the ghost-map linter end to end.

## Topology

The single feature surface lives under `src/components`. Tokens resolve via
`src/styles/tokens.css`. Excludes are limited to build output.

## Conventions

Components live alongside their tests; the registry is generated from the
component sources at build time.
