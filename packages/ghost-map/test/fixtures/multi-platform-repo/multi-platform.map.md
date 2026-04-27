---
schema: ghost.map/v1
id: multi-platform-fixture
repo: example/multi-platform
mapped_at: 2026-04-27
platform: [ios, android, web]
languages:
  - { name: typescript, files: 12, share: 0.45 }
  - { name: swift, files: 9, share: 0.30 }
  - { name: kotlin, files: 7, share: 0.25 }
build_system: [yarn, gradle, xcode]
package_manifests:
  - package.json
  - Package.swift
  - settings.gradle.kts
composition:
  frameworks:
    - { name: react, version: "19.0.0" }
  rendering: react-dom
  styling:
    - tailwindcss-v4
design_system:
  paths:
    - tokens
  entry_files:
    - tokens/colors.json
  status: active
ui_surface:
  include:
    - "src/**"
  exclude:
    - "dist/**"
feature_areas:
  - name: shared
    paths: ["src/shared"]
orientation_files:
  - README.md
---

## Identity

Tri-platform fixture covering iOS (Package.swift), Android (Gradle), and web (package.json) — used to validate that `platform:` and `build_system:` accept array values.

## Topology

Each platform owns its slice; tokens live in `tokens/` and are emitted by a Style Dictionary build that the recipe authoring this map didn't bother to model.

## Conventions

- Single source of truth for tokens lives at `tokens/colors.json`
- Each platform consumes those tokens through its own pipeline
