---
schema: ghost.map/v1
id: cash-android
repo: example/cash-android
mapped_at: 2026-04-26
platform: android
languages:
  - { name: kotlin, files: 1500, share: 0.97 }
  - { name: java, files: 40, share: 0.03 }
build_system: gradle
package_manifests:
  - settings.gradle.kts
  - build.gradle.kts
composition:
  frameworks:
    - { name: compose }
  rendering: compose
  styling:
    - material3
design_system:
  paths:
    - app/src/main/kotlin/com/example/cash/theme
  entry_files:
    - app/src/main/kotlin/com/example/cash/theme/Theme.kt
  status: active
ui_surface:
  include:
    - app/src/main/kotlin/com/example/cash/ui/**
  exclude:
    - "**/build/**"
feature_areas:
  - name: home
    paths:
      - app/src/main/kotlin/com/example/cash/ui/home
  - name: cards
    paths:
      - app/src/main/kotlin/com/example/cash/ui/cards
orientation_files:
  - README.md
---

## Identity

Cash on Android, rendered with Jetpack Compose. The Material 3 theme is
extended into a Cash-branded surface, with custom shape and color tokens.

## Topology

Theme tokens resolve through `Theme.kt`, which composes a custom palette
on top of a Material 3 base. UI lives under `ui/`; build outputs under
`build/` are excluded.

## Conventions

Composables follow a `Cash` prefix where they extend Material primitives.
Tokens live in Kotlin, not XML.
