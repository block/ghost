---
schema: ghost.map/v1
id: ghost-ui
repo: example/ghost-ui
mapped_at: 2026-04-25
platform: web
languages:
  - { name: typescript, files: 200, share: 0.94 }
  - { name: css, files: 12, share: 0.06 }
build_system: pnpm
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react
  styling:
    - tailwind
registry:
  path: registry.json
  components: 49
design_system:
  paths:
    - src/components/ui
  entry_files:
    - src/styles/main.css
  status: active
ui_surface:
  include:
    - src/components/**
  exclude:
    - "**/dist/**"
feature_areas:
  - name: catalogue
    paths:
      - src/components/ui
orientation_files:
  - README.md
---

## Identity

A reference component library — 49 UI primitives — distributed via shadcn
registry. Editorial, monochromatic visual language.

## Topology

Tokens resolve through `src/styles/main.css`. Components live under
`src/components/ui`. The registry sources its component list directly
from this directory.

## Conventions

Components use the shadcn convention (one file per primitive, slot
composition for variants).
