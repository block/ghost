---
schema: ghost.map/v1
id: cash-web
repo: example/cash-web
mapped_at: 2026-04-26
platform: web
languages:
  - { name: typescript, files: 120, share: 0.95 }
  - { name: css, files: 6, share: 0.05 }
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
  components: 24
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
  - name: payments
    paths:
      - src/payments
  - name: accounts
    paths:
      - src/accounts
orientation_files:
  - README.md
---

## Identity

Cash on the web. A consumer payments app rendered as a single-page React
application with a shadcn-style component registry.

## Topology

Tokens resolve through `src/styles/tokens.css`. Components live under
`src/components/**`; product surfaces split between `payments` and
`accounts`. The `dist/` directory is a build output and is excluded from
sampling.

## Conventions

Component files colocate their tests. Token names follow Tailwind's
`@theme` convention. The registry is generated at build time.
