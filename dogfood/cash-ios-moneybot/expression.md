---
id: cash-ios-moneybot
source: llm
timestamp: 2026-05-04T00:00:00Z
sources:
  - squareup/cash-ios/Code/Features/Moneybot
  - squareup/cash-ios/Code/DesignSystem/Arcade
  - squareup/cash-ios/Code/DesignSystem/ArcadeSwiftUI
  - "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens"
observation:
  personality:
    - native
    - assistant-like
    - token-led
    - rounded
    - ambient
    - calm
  resembles:
    - Cash App
    - Apple Human Interface Guidelines
references:
  specs:
    - MoneybotUI/MoneybotUI/Sources/Extensions/Color+MoneybotUI.swift
    - MoneybotUI/MoneybotUI/BUILD.bazel
    - MoneybotChat/MoneybotChatImplementations/BUILD.bazel
  components:
    - MoneybotUI/MoneybotUI/Sources
    - MoneybotUI/MoneybotUIImplementations/Sources
    - MoneybotChat/MoneybotChatImplementations/Sources/Views
    - MoneybotHome/MoneybotHomeImplementations/Sources
    - MoneybotAutomationsHub/MoneybotAutomationsHubImplementations/Sources
    - MoneybotCanvas/MoneybotCanvasImplementations/Sources
  examples:
    - MoneybotChat/MoneybotChatImplementations/Sources/Views/ChatContent/TemplateCard/TemplateCardView.swift
    - MoneybotChat/MoneybotChatImplementations/Sources/Views/Chat/ComposerView.swift
    - MoneybotHome/MoneybotHomeImplementations/Sources/MoneybotHomeView.swift
    - MoneybotUI/MoneybotUIImplementations/Sources/BriefView.swift
    - MoneybotAutomationsHub/MoneybotAutomationsHubImplementations/Sources/MoneybotAutomationsHubView.swift
decisions:
  - dimension: color-strategy
  - dimension: token-architecture
  - dimension: spatial-system
  - dimension: shape-language
  - dimension: typography-voice
  - dimension: surface-hierarchy
  - dimension: composition-patterns
  - dimension: motion
  - dimension: rendering-posture
    dimension_kind: composition-patterns
checks: []
palette:
  dominant:
    - { role: moneybot-card-dark, value: "#101010" }
    - { role: elevated-light, value: "#fcfcfc" }
    - { role: canvas-background, value: "#000000" }
    - { role: canvas-foreground, value: "#ffffff" }
  neutrals:
    steps:
      - "#000000"
      - "#101010"
      - "#232323"
      - "#666666"
      - "#878787"
      - "#e8e8e8"
      - "#fcfcfc"
      - "#ffffff"
    count: 8
  semantic: []
  saturationProfile: muted
  contrast: high
spacing:
  scale: [0, 1, 2, 4, 8, 10, 12, 16, 20, 24, 32, 36, 40, 44, 48, 50, 56, 60, 80, 100, 150, 180, 200, 240, 250, 272, 280, 300, 320, 350, 362, 375, 390, 393, 400, 428]
  regularity: 0.62
  baseUnit: 4
typography:
  families:
    - ArcadeTextStyle
    - monospacedSystem
  sizeRamp: [80]
  weightDistribution:
    "700": 1
  lineHeightPattern: normal
surfaces:
  borderRadii: [0, 0.5, 1, 4, 8, 10, 16, 20, 26, 32, 40]
  shadowComplexity: deliberate-none
  borderUsage: moderate
metadata:
  mode: consumer
  survey_values: 77
  survey_tokens: 74
  survey_components: 113
  unresolved_resolver: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens"
  top_component_module: MoneybotChat/MoneybotChatImplementations
---

# Character

A native assistant language sits on Cash iOS Arcade foundations: bright app backgrounds, semantic text and icon tokens, compact rounded controls, and a few deliberately dark Moneybot card moments for generated financial content. The mood is calm and task-focused rather than decorative, with AI-specific surfaces feeling like a continuation of Cash App instead of a separate chat product. Variety comes from switching composition modes - chat feed, home entry, generated template card, brief, automations list, and ambient canvas - while the visual grammar stays token-led and restrained.

# Signature

The recognizable picture is a full-screen iOS surface with Arcade semantic backgrounds, bottom-heavy composer controls, rounded generated cards, and minimal chrome. Chat and home experiences favor a white or app-background field, then introduce dark rounded cards, glassy composer affordances, or a Metal-backed canvas only when the assistant interaction needs a stronger stage. The system reads as Cash-native first and AI-native second: assistant affordances are shaped as product controls, not as a separate visual brand.

# Decisions

### color-strategy

Use Arcade semantic color for the default app, text, icon, border, button, and warning roles; keep local Moneybot literals narrow and role-specific. The local palette is neutral and high-contrast: `#101010` anchors dark generated cards, `#fcfcfc` anchors elevated light surfaces, `#000000` / `#ffffff` appear in canvas and UIKit bridge contexts, and `#232323`, `#666666`, `#878787`, `#e8e8e8` support generated avatar/preview assets rather than broad UI theming.

**Evidence:**
- Survey color values are neutral-only: `#000000`, `#101010`, `#232323`, `#666666`, `#878787`, `#e8e8e8`, `#fcfcfc`, `#ffffff`, plus transparent layers.
- `.Arcade.Semantic.Background.app` appears 110 times across 41 files; `.Arcade.Semantic.Text.standard` appears 44 times across 30 files; `.Arcade.Semantic.Text.subtle` appears 31 times across 26 files.
- `Color.MoneybotUI.card` resolves locally to `#101010` and appears 4 times across 2 files; `Color.MoneybotUI.card(for:)` maps light to `.Arcade.Semantic.Background.subtle`, dark to `#101010`, and default to `.Arcade.Semantic.Background.subtle`.
- `Color.MoneybotUI.ElevatedBackground(for:)` maps light to `#fcfcfc`, dark to `.Arcade.Semantic.Background.standard`, and default to `.Arcade.Semantic.Background.app`.
- Prominent actions stay Arcade-owned: `.Arcade.Component.Button.Prominent.Background.normal` appears 12 times and `.Arcade.Component.Button.Prominent.Icon.normal` appears 6 times.

### token-architecture

Treat Moneybot as a consumer expression layered over Arcade, not a standalone token system. New UI should reach first for `.Arcade.Semantic.*`, `.Arcade.Component.*`, `.Arcade.*` spacing/radius tokens, `ArcadeTextStyle.*`, and `Color.MoneybotUI.*` only for the few local surface overrides that the feature owns.

**Evidence:**
- The survey found 74 token rows; the highest-use symbols are external Arcade tokens, while local Moneybot color tokens are limited to card and elevated background roles.
- Spacing token use is broad: `.Arcade.small` appears 82 times, `.Arcade.medium` 60 times, `.Arcade.margin` 45 times, `.Arcade.large` 16 times, and `.Arcade.xsmall` 14 times.
- `ArcadeTokens` is resolved through Bazel external `@swiftpkg_cash_arcade_tokens_spm`, so the expression keeps unresolved Arcade values symbolic instead of inventing upstream concrete values.
- Moneybot's local token file is a Swift extension, not a full token pipeline: `Color.MoneybotUI.card`, `card(for:)`, `ElevatedBackground(for:)`, and `ElevatedBackgroundPressed(for:)` are overrides on top of Arcade semantics.

### spatial-system

Use Arcade spacing tokens for rhythm and margins, then allow fixed iOS content measures where generated UI needs a stable shape. The concrete scale includes small 4px-step values for padding and separators, 24px margins for card and composer affordances, 44px controls, and repeated mobile preview widths around 300-390px.

**Evidence:**
- Survey spacing rows cluster around `0`, `4`, `8`, `16`, `24`, `44`, `56`, and fixed container widths such as `300`, `320`, `350`, `375`, and `390`.
- `.Arcade.margin` appears 45 times across 22 files and drives horizontal page/composer margins.
- Template cards use 24px margin, 320px width, and 8px template line spacing; navigation cards and composer buttons use compact 44px-scale controls.
- The scale is 4px-based but intentionally irregular because it includes generated preview containers, canvas test frames, and device-width fixtures.

### shape-language

Favor soft, highly rounded native shapes. Arcade radius tokens carry ordinary component rounding, while Moneybot adds pill-like 26px composer containers and 40px generated template cards/buttons for assistant content that should feel approachable and tappable.

**Evidence:**
- Survey radius values include `0`, `0.5`, `1`, `4`, `8`, `10`, `16`, `20`, `26`, `32`, and `40`.
- `.Arcade.CornerRadius.small`, `.Arcade.CornerRadius.medium`, `.Arcade.CornerRadius.large`, and `.Arcade.CornerRadius.xlarge` all appear in product code.
- `cornerRadius: CGFloat = 40` appears 4 times across 4 files in template card/button surfaces.
- Composer surfaces use `cornerRadius: CGFloat = 26` and compact shapes derived from Arcade large plus small radius tokens.

### typography-voice

Let Arcade text styles set the voice: product-native labels, body copy, inputs, headlines, and page titles should remain on `ArcadeTextStyle` rather than local type math. The one strong local exception is the canvas debug/rendering layer, where large bold monospaced system type is part of the rendering surface rather than the product UI voice.

**Evidence:**
- `ArcadeTextStyle.pageTitle` appears 5 times, `bodyMedium` 2 times, `headlineSmall` 2 times, `labelXSmall` 2 times, and `bodySmall` / `input` in supporting UI.
- `.font(.Arcade.bodyMedium)` appears as a SwiftUI convenience form for the same upstream type system.
- The only concrete font size row is `monospacedSystemFont(ofSize: 80, weight: .bold)`, isolated to canvas rendering evidence.
- No local font files or feature-specific typeface declarations were observed in the Moneybot target.

### surface-hierarchy

Build hierarchy through semantic background roles, rounded borders, state overlays, and control density rather than shadows. Default surfaces sit on `.Arcade.Semantic.Background.app`; raised Moneybot moments use `Color.MoneybotUI.ElevatedBackground` or `Color.MoneybotUI.card`; borders are meaningful when they indicate subtle separation, warning, or brand focus.

**Evidence:**
- The survey found no shadow rows, while `.Arcade.Semantic.Border.subtle` appears 10 times and `.Arcade.Semantic.Border.brand` appears 6 times.
- Brief cards and template cards use rounded filled surfaces instead of drop shadows.
- Chat composer warning states use a border overlay, not an elevated shadow treatment.
- `Color.MoneybotUI.ElevatedBackgroundPressed(for:)` maps light to `.Arcade.Semantic.Background.subtle`, dark to `.Arcade.Semantic.Background.prominent`, and default to `.Arcade.Semantic.Background.app`.

### composition-patterns

Choose the surface shape from the assistant task. Chat messages, generated template cards, brief summaries, automation rows, home widgets, and canvas interactions are all first-class compositions; repeated cards are one tool, not the default answer for every generated UI.

**Evidence:**
- The survey found 113 component rows across implementation modules; 52 are in `MoneybotChat/MoneybotChatImplementations`, 21 in `MoneybotUI/MoneybotUI`, 18 in `MoneybotUI/MoneybotUIImplementations`, and 12 in `MoneybotHome/MoneybotHomeImplementations`.
- Component names include `TemplateCardView`, `TextMessageView`, `ComposerView`, `ChatComposerView`, `NavigationCard`, `BriefView`, `MoneybotEmptyStateView`, `MoneybotHomeView`, `MoneybotAutomationsHubView`, `CanvasBackgroundView`, and `AudioWaveformView`.
- Automations surfaces use list rows and empty/error states; brief surfaces use larger rounded content blocks; generated template cards use compact 320px assistant cards.
- Snapshot and reference-image paths in the map show that visible UI states are treated as reviewable examples, not just implementation details.

### motion

Keep motion functional and short: use Arcade smooth springs for native state continuity and 100-300ms ease transitions for press, composer, list, and reveal behavior. Motion should reinforce state change or spatial continuity, not become decorative ambience outside the canvas interaction layer.

**Evidence:**
- Survey motion values are `100ms`, `120ms`, `150ms`, `200ms`, `250ms`, `300ms`, plus `.Arcade.Spring.Smooth.fast`, `.gentle`, and `.slow`.
- `100ms` ease-out appears 5 times across 4 files; `300ms` ease-out appears 4 times across 3 files; `.Arcade.Spring.Smooth.fast` appears 3 times.
- Template card press behavior uses `easeOut(0.1)`, and composer/container changes use short ease-in-out transitions.
- No long-running decorative animation system was observed in the feature survey.

### rendering-posture

Prefer native SwiftUI/UIKit construction for product UI and reserve custom rendering for the Moneybot canvas. The Metal-backed canvas can be immersive and full-bleed, but surrounding assistant controls should still use Arcade semantics, safe-area-aware native layout, and Cash iOS navigation conventions.

**Evidence:**
- Map composition is mixed native SwiftUI/UIKit with Metal as a scoped rendering layer.
- `MoneybotCanvas` contributes 4 component rows, while the bulk of the visible surface is SwiftUI/UIKit product UI.
- `CanvasBackgroundView` is a full-bleed Metal-backed surface with fallback `Color.black`; home and chat still use `.Arcade.Semantic.Background.app` and native safe-area/titlebar structure.
- The source graph includes `Arcade`, `ArcadeSwiftUI`, and `ArcadeTokens` as resolvers, confirming that custom rendering is an exception around a tokenized native shell.
