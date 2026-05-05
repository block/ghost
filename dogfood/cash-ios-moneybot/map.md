---
schema: ghost.map/v1
id: cash-ios-moneybot
repo: squareup/cash-ios/Code/Features/Moneybot
subject:
  id: cash-ios-moneybot
  target: /Users/nahiyan/Development/cash-ios/Code/Features/Moneybot
sources:
  - id: moneybot
    role: primary
    target: /Users/nahiyan/Development/cash-ios/Code/Features/Moneybot
    paths:
      - .
  - id: arcade
    role: resolver
    target: /Users/nahiyan/Development/cash-ios/Code/DesignSystem/Arcade
    resolves: [color, spacing, typography, radius, haptics, components]
    paths:
      - ../../DesignSystem/Arcade
  - id: arcade-swiftui
    role: resolver
    target: /Users/nahiyan/Development/cash-ios/Code/DesignSystem/ArcadeSwiftUI
    resolves: [swiftui-components, typography, spacing, interaction]
    paths:
      - ../../DesignSystem/ArcadeSwiftUI
  - id: arcade-tokens
    role: resolver
    target: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens"
    resolves: [color, spacing, typography, radius, haptics]
mapped_at: 2026-05-04
platform: ios
languages:
  - { name: swift, files: 651, share: 0.929 }
  - { name: json, files: 18, share: 0.026 }
  - { name: yaml, files: 17, share: 0.024 }
  - { name: markdown, files: 15, share: 0.021 }
build_system: [bazel, xcode]
package_manifests:
  - AutomationsHub/AutomationsHub/BUILD.bazel
  - AutomationsHub/AutomationsHubFakes/BUILD.bazel
  - AutomationsHub/AutomationsHubImplementations/BUILD.bazel
  - MoneybotAutomationsHub/MoneybotAutomationsHub/BUILD.bazel
  - MoneybotAutomationsHub/MoneybotAutomationsHubFakes/BUILD.bazel
  - MoneybotAutomationsHub/MoneybotAutomationsHubImplementations/BUILD.bazel
  - MoneybotCanvas/MoneybotCanvas/BUILD.bazel
  - MoneybotCanvas/MoneybotCanvasFakes/BUILD.bazel
  - MoneybotCanvas/MoneybotCanvasImplementations/BUILD.bazel
  - MoneybotChat/MoneybotChat/BUILD.bazel
  - MoneybotChat/MoneybotChatFakes/BUILD.bazel
  - MoneybotChat/MoneybotChatImplementations/BUILD.bazel
  - MoneybotContainer/MoneybotContainer/BUILD.bazel
  - MoneybotContainer/MoneybotContainerFakes/BUILD.bazel
  - MoneybotContainer/MoneybotContainerImplementations/BUILD.bazel
  - MoneybotHome/MoneybotHome/BUILD.bazel
  - MoneybotHome/MoneybotHomeFakes/BUILD.bazel
  - MoneybotHome/MoneybotHomeImplementations/BUILD.bazel
  - MoneybotUI/MoneybotUI/BUILD.bazel
  - MoneybotUI/MoneybotUIFakes/BUILD.bazel
  - MoneybotUI/MoneybotUIImplementations/BUILD.bazel
composition:
  frameworks:
    - { name: swiftui }
    - { name: uikit }
    - { name: metal }
    - { name: bazel }
    - { name: arcade }
    - { name: arcade-swiftui }
    - { name: arcade-tokens }
    - { name: markdownui }
  rendering: mixed-native-swiftui-uikit
  styling:
    - arcade-tokens
    - swiftui-modifiers
    - uikit-models
    - xcassets
  navigation: cash-ios-navigation
design_system:
  paths:
    - MoneybotUI/MoneybotUI/Sources
    - MoneybotUI/MoneybotUIImplementations/Sources
    - MoneybotChat/MoneybotChatImplementations/Sources/Views
    - MoneybotHome/MoneybotHomeImplementations/Sources
    - MoneybotAutomationsHub/MoneybotAutomationsHubImplementations/Sources
    - MoneybotCanvas/MoneybotCanvasImplementations/Sources
  entry_files:
    - MoneybotUI/MoneybotUI/Sources/Extensions/Color+MoneybotUI.swift
    - MoneybotUI/MoneybotUI/BUILD.bazel
    - MoneybotUI/MoneybotUIImplementations/BUILD.bazel
    - MoneybotChat/MoneybotChatImplementations/BUILD.bazel
  token_source: mixed
  upstream:
    - Code/DesignSystem/Arcade
    - Code/DesignSystem/ArcadeSwiftUI
    - "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens"
  status: active
ui_surface:
  include:
    - AutomationsHub/**/Sources/**
    - MoneybotAutomationsHub/**/Sources/**
    - MoneybotCanvas/**/Sources/**
    - MoneybotChat/**/Sources/Views/**
    - MoneybotHome/**/Sources/**
    - MoneybotUI/**/Sources/**
    - "**/SnapshotTests/**"
    - "**/ReferenceImages/**"
  exclude:
    - "**/Fakes/**"
    - "**/DevApp/**"
    - "**/UnitTests/**"
    - "**/Networking/Proto/**"
    - "**/Resources/en.lproj/**"
    - "**/OWNERS.yaml"
    - "**/AGENTS.md"
    - "**/BUILD.bazel"
feature_areas:
  - name: shared-moneybot-ui
    paths:
      - MoneybotUI/MoneybotUI/Sources
      - MoneybotUI/MoneybotUIImplementations/Sources
    sub_areas:
      - empty-state
      - navigation-card
      - brief
      - chart
      - cells
      - suggestion
  - name: chat
    paths:
      - MoneybotChat/MoneybotChatImplementations/Sources/Views
    sub_areas:
      - composer
      - chat-feed
      - text-message
      - template-card
      - markdown
      - generated-ui-playground
  - name: home
    paths:
      - MoneybotHome/MoneybotHomeImplementations/Sources
    sub_areas:
      - home-view
      - overflow-menu
      - widgets
      - next-best-action
  - name: automations
    paths:
      - AutomationsHub/AutomationsHub/Sources
      - AutomationsHub/AutomationsHubImplementations/Sources
      - MoneybotAutomationsHub/MoneybotAutomationsHub/Sources
      - MoneybotAutomationsHub/MoneybotAutomationsHubImplementations/Sources
    sub_areas:
      - automation-row
      - triggered-action-row
      - hub-list
      - empty-error-states
  - name: canvas
    paths:
      - MoneybotCanvas/MoneybotCanvas/Sources
      - MoneybotCanvas/MoneybotCanvasImplementations/Sources
    sub_areas:
      - metal-background
      - ripple
      - touch-overlay
      - volume-detection
  - name: snapshots-and-assets
    paths:
      - MoneybotUI/MoneybotUIImplementations/SnapshotTests
      - MoneybotChat/MoneybotChatImplementations/SnapshotTests
      - MoneybotCanvas/MoneybotCanvasImplementations/SnapshotTests
      - MoneybotAutomationsHub/MoneybotAutomationsHubImplementations/SnapshotTests
      - MoneybotUI/MoneybotUIImplementations/Sources/Resources/Images.xcassets
orientation_files:
  - /Users/nahiyan/Development/cash-ios/AGENTS.md
  - MoneybotUI/MoneybotUI/Sources/Extensions/Color+MoneybotUI.swift
  - MoneybotUI/MoneybotUI/BUILD.bazel
  - MoneybotChat/MoneybotChatImplementations/BUILD.bazel
  - MoneybotChat/MoneybotChatImplementations/Sources/Views/ChatContent/TemplateCard/TemplateCardView.swift
  - MoneybotChat/MoneybotChatImplementations/Sources/Views/Chat/ChatComposerView.swift
  - MoneybotHome/MoneybotHomeImplementations/Sources/MoneybotHomeView.swift
  - MoneybotCanvas/MoneybotCanvasImplementations/Sources/CanvasBackgroundView.swift
---

## Identity

Moneybot is a Cash iOS feature cluster for the app's assistant surfaces: chat, generated UI, home entry points, automations, a canvas background, and reusable Moneybot UI pieces. It is a module-level iOS target inside `squareup/cash-ios`, not a standalone design system package, so its expression should describe the Moneybot feature language rather than all of Cash App.

## Topology

The local design-system signal is concentrated in `MoneybotUI`, which defines shared SwiftUI/UIKit pieces and one local `Color.MoneybotUI` extension for elevated and card backgrounds. Most concrete token meaning comes from upstream Arcade modules: Moneybot imports Arcade, ArcadeSwiftUI, UIControls, and the external ArcadeTokens Swift package through Bazel targets, while product areas consume those tokens in SwiftUI modifiers, UIKit models, generated proto renderers, and snapshot-tested views.

Product salience comes from the implementation modules. `MoneybotChatImplementations` is the largest UI surface and owns chat feed, composer, markdown, template cards, generated UI previews, and networking-backed renderables; `MoneybotUIImplementations` owns shared components and snapshot fixtures; `MoneybotHome`, `MoneybotAutomationsHub`, `AutomationsHub`, and `MoneybotCanvas` add home, list, automation, and Metal-backed ambient surfaces.

## Conventions

The feature follows the Cash iOS module pattern: base protocols, implementation modules, fakes, Bazel `ios_framework` targets, and snapshot tests for visible UI states. Styling is token-first when the token is available (`.Arcade.Semantic.*`, `.Arcade.*`, `ArcadeTextStyle.*`, `Image.Arcade.*`), with local literals mostly reserved for the Moneybot card/elevated override, canvas drawing, generated preview fixtures, and snapshot proto color inputs.

Because ArcadeTokens is external to this checkout, a full survey should keep primary Moneybot usage counts separate from resolver meaning. Resolved rows can cite local Moneybot literals and Arcade wrapper symbols; unresolved ArcadeTokens rows should remain symbolic rather than pretending the upstream package's concrete palette is locally visible.
