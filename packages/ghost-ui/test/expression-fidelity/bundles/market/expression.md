---
id: market
source: llm
timestamp: 2026-04-28T00:00:00Z
observation:
  personality:
    - utilitarian
    - systematic
    - restrained
    - dense
    - structural
    - mode-aware
  resembles:
    - cash-app
    - shopify-polaris
    - github-primer
decisions:
  - dimension: color-strategy
  - dimension: chromatic-reserve
  - dimension: spatial-system
  - dimension: typography-voice
  - dimension: surface-hierarchy
  - dimension: density
  - dimension: motion
  - dimension: state-modeling
  - dimension: theming-architecture
  - dimension: cross-platform-fidelity
palette:
  dominant:
    - role: emphasis-fill-light
      value: "#101010"
    - role: emphasis-fill-dark
      value: "#FFFFFF"
    - role: surface-light
      value: "#FFFFFF"
    - role: surface-dark-5
      value: "#080808"
    - role: surface-dark-10
      value: "#141414"
    - role: surface-dark-20
      value: "#1C1C1C"
    - role: surface-dark-30
      value: "#2D2D2D"
  neutrals:
    steps:
      - "#FFFFFF"
      - "#101010"
    count: 17
  semantic:
    - role: critical
      value: "#CC0023"
    - role: warning
      value: "#FF9F40"
    - role: success
      value: "#00B23B"
    - role: info
      value: "#006AFF"
    - role: purple
      value: "#8716D9"
    - role: pink
      value: "#D936B0"
    - role: burgundy
      value: "#990838"
  saturationProfile: muted
  contrast: high
spacing:
  scale:
    - 2
    - 4
    - 8
    - 12
    - 16
    - 20
    - 24
    - 32
    - 40
    - 48
    - 64
    - 80
    - 120
    - 160
  regularity: 0.85
  baseUnit: 4
typography:
  families:
    - Cash Sans Text
    - Cash Sans Display
    - Cash Sans Mono
  sizeRamp:
    - 12
    - 14
    - 16
    - 19
    - 25
    - 32
    - 48
  weightDistribution:
    "400": 4
    "500": 5
    "600": 4
    "700": 1
  lineHeightPattern: normal
surfaces:
  borderRadii:
    - 0
    - 2
    - 4
    - 6
    - 12
    - 16
    - 24
    - 32
    - 1000
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

Market is Square's cross-platform design language — a CMPT-structured (Component / Modifier / Part / Type) token graph piped through Style Dictionary into Stencil web components, SwiftUI/UIKit modules, and Jetpack Compose modules. The personality is utilitarian and structural rather than expressive: the default theme renders monochromatically with near-black emphasis on white, a wide neutral ramp does most of the work, and a full chromatic palette sits in reserve for status semantics and theme overlays. Visual decisions are encoded as states-modes-variants tables — every interactive element ships normal/hover/pressed/focus/disabled × light/dark × variant tokens — which produces a system that feels exhaustive and machine-checkable rather than hand-crafted. Identity expression happens at the theme layer (Buyer-Facing, Tidal, Noho, S3, legacy Market Blue), not in the base.

# Signature

- Monochromatic by default: `core.emphasis-fill` ships as `#101010` light / `#FFFFFF` dark even though the source aliases it to `core.blue-fill` — chromatic identity is opt-in via theme overlays, not a base-system trait.
- A full chromatic palette is defined and reserved: green / forest / teal / blue / sky / purple / pink / burgundy / red / orange / gold / yellow / taupe / brown each ship as a 6-step set (fill, text, 10, 20, 30, 40) but the base system only consumes them through semantic aliases (`success`, `warning`, `critical`, `emphasis`).
- A 17-step grayscale ramp from `#FFFFFF` to `#000000` (with a separate `core.constant.gray-*` track) carries most of the visual weight — surfaces, dividers, fills, and text are all neutrals first.
- Every interactive token is enumerated as a full state × mode × variant matrix — `state:normal | hover | pressed | focus | disabled` × `mode:light | dark` × `variant:normal | destructive` — rather than computed via opacity or color-mix.
- Three weight tracks (`text`, `display`, `mono`) all use the Cash Sans superfamily; `display` is reserved for headings ≥19px, `text` for body and small heading, `mono` for code.
- Spacing tokens are named numerically in a `25 / 50 / 100 / 150 / 200 / 250 / 300 / 400 / 500 / 600 / 800 / 1000 / 1500 / 2000` system that maps to `2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 120 / 160` px — the names are intentionally decoupled from absolute pixels so themes can rescale.
- Border radii are dual-named as a pixel scale (`33 → 2px`, `66 → 4px`, `100 → 6px`, `200 → 12px`, `266 → 16px`, `400 → 24px`, `533 → 32px`) plus role aliases (`forms`, `modals`, `circle: 1000`); buttons default to `radius.100` (6px), pills to `radius.circle` (∞).
- Shadows are absent from the system — no `shadow` or `elevation` tokens at the core layer; surface separation is achieved with surface-stack tokens (`surface-5/10/20/30`) and dividers, not z-layered shadow.
- Animation is encoded as three named curves (`enter`, `exit`, `move`) each with three speeds (`fast: 100ms`, `moderate: 160-240ms`, `slow: 300-400ms`); easing differs per direction (asymmetric in/out cubic-bezier).
- Themes are diff-overlays, not parallel systems: Buyer-Facing, Monochrome, Tidal, Noho, S3, Starter — each ships as a sparse JSON override package that replaces specific tokens (e.g. button radii, type ramps, emphasis colors) on top of the base graph.
- Component tokens never reference base color primitives directly — they always go through the semantic layer (`{core.emphasis-fill...}`, `{core.critical-text...}`), so swapping `emphasis` to a different hue retones the entire system.

# Decisions

### Color strategy
The default Market system is monochromatic-with-status: the action/identity color is grayscale near-black on white (light) or near-white on near-black (dark), and the chromatic palette is reserved for semantic states (success / warning / critical / info). Brand color is treated as a property of the *consuming app's theme*, not of the design system itself — the system ships the structure for color but defers the identity hue to overlays.

**Evidence:**
- `\`--core-emphasis-fill-light-mode-color: #101010\` (\`common/design-tokens/dist/css/properties.css:144\`)`
- `\`--core-emphasis-fill-dark-mode-color: #FFFFFF\` (\`common/design-tokens/dist/css/properties.css:143\`)`
- `17-step grayscale ramp \`core.constant.gray-10..98\` plus \`black\` and \`white\` (\`common/design-tokens/tokens/core/color.json:635\`)`
- `Semantic aliases (\`success-fill\`, \`warning-fill\`, \`critical-fill\`, \`emphasis-fill\`) all alias to chromatic primitives in source but ship monochrome by default (\`common/design-tokens/tokens/core/color.json:91\`)`

### Chromatic reserve
The repo declares a complete 14-hue chromatic palette (green, forest, teal, blue, sky, purple, pink, burgundy, red, orange, gold, yellow, taupe, brown) with a uniform 6-step structure (`fill`, `text`, `10`, `20`, `30`, `40`) per hue. None of these are referenced directly by component tokens — components only consume the *semantic* abstractions on top (`emphasis-*`, `success-*`, `warning-*`, `critical-*`). This makes the chromatic palette a reserved vocabulary that themes opt into, rather than a fixed identity the base system asserts.

**Evidence:**
- `\`core.green-fill = #00B23B\`, \`core.red-fill = #CC0023\`, \`core.gold-fill = #FF9F40\`, \`core.blue-fill = #006AFF\` (\`common/design-tokens/tokens/core/color.json:299..540\`)`
- `\`purple-fill = #8716D9\`, \`pink-fill = #D936B0\`, \`burgundy-fill = #990838\` (\`common/design-tokens/tokens/core/color.json:419..473\`)`
- `Component tokens reference only semantic aliases: \`button.variant:normal.rank:primary.state:normal.background.color = {core.emphasis-fill...}\` (\`common/design-tokens/tokens/components/button.json:243\`)`
- `Banner/icon-button/checkbox component tokens reference \`{core.emphasis-fill...}\`, never \`{core.blue-fill...}\` directly`

### Spatial system
Spacing is a logarithmic-ish ramp keyed by *intent index* (`25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1500, 2000`) rather than by raw pixels — the index maps to px (`25→2`, `100→8`, `200→16`, `400→32`, `1000→80`) but the name carries the meaning. Component tokens always reference the index, not the pixel, which means a theme can rescale density by remapping the index without touching component graphs.

**Evidence:**
- `\`core.metrics.spacing.{25:2, 50:4, 100:8, 150:12, 200:16, 250:20, 300:24, 400:32, 500:40, 600:48, 800:64, 1000:80, 1500:120, 2000:160}\` (\`common/design-tokens/tokens/core/metrics.json:5\`)`
- `\`button.size:medium.rank:tertiary.vertical.padding = {core.metrics.spacing.150}\` (\`common/design-tokens/tokens/components/button.json:147\`)`
- `\`core.minimum-height.{50:24, 75:32, 100:40, 200:48, 300:64, 400:80}\` for control sizing (\`common/design-tokens/tokens/core/minimum-height.json:5\`)`
- `\`--market-core-base-size: 8px\` exposed as the system base (\`common/design-tokens/dist/css/core/Core.tokens.base.css:21\`)`

### Typography voice
Three Cash Sans tracks (`text`, `display`, `mono`) form a single typeface family with role separation. The size ramp is asymmetric and slightly compressed (`12 / 14 / 16 / 19 / 25 / 32 / 48`), and `display` is reserved for `heading-20` and above (≥19px) — smaller headings use the `text` family. Weights run `400 / 500 / 600 / 700`; the system prefers `500` (medium) and `600` (semibold) for emphasis rather than `700`. Heading-5 (12px uppercase, +0.05 tracking) is the only labeled use of letter-spacing in the ramp.

**Evidence:**
- `\`core.type.fontFamily = "Cash Sans Text"\`, fallbacks \`[Helvetica, Arial, sans-serif]\` (\`common/design-tokens/tokens/core/type.json:24\`)`
- `\`core.type.display.fontFamily = "Cash Sans Display"\`, \`core.type.mono.fontFamily = "Cash Sans Mono"\` (\`common/design-tokens/tokens/core/type.json:30\`)`
- `Heading ramp \`5:12 / 10:14 / 20:19 / 30:25\`; display \`10:32 / 20:48\`; paragraph \`10:12 / 20:14 / 30:16\` (\`common/design-tokens/tokens/core/type-styles.json\`)`
- `\`heading.5\` is uppercase with \`tracking: 0.05\`; all other styles use \`tracking: 0\` and \`case: regular\` (\`common/design-tokens/tokens/core/type-styles.json:53\`)`

### Surface hierarchy
Surface separation uses a stacked-flat-fill model (`surface-5 / 10 / 20 / 30`) — light mode collapses all four to `#FFFFFF` and relies on dividers (`divider-10/20`) and inner fills (`fill-30/40/50` at 3-15% black) for separation; dark mode steps the surfaces (`#080808 / #141414 / #1C1C1C / #2D2D2D`) for elevation. There are no shadow tokens at the core layer — elevation is purely a function of fill opacity and surface stack.

**Evidence:**
- `\`core.surface-{5,10,20,30}.mode:light = rgba(255,255,255,1)\` (all identical) (\`common/design-tokens/tokens/core/color.json:67..82\`)`
- `\`core.surface-{5,10,20,30}.mode:dark = #080808 / #141414 / #1C1C1C / #2D2D2D\` (\`common/design-tokens/tokens/core/color.json:67..82\`)`
- `\`core.fill-{30,40,50}\` at 15% / 5% / 3% black opacity for layered fills (\`common/design-tokens/tokens/core/color.json:35..46\`)`
- `No \`shadow\`, \`elevation\`, or \`box-shadow\` tokens defined at the core layer (verified by absence in \`tokens/core/*.json\`)`

### Density
Component sizing is exposed as a three-step `size:small / medium / large` axis driven by `core.minimum-height.{100, 200, 300}` (40 / 48 / 64 px), with vertical padding derived from `core.padding-set.*` rather than computed from text. Buttons explicitly decouple height from content via a `minimum-width.multiplier` of 1.5× — the button is at least 1.5× as wide as it is tall, regardless of label length. This produces a system that holds shape consistency over content density, but with explicit dynamic-type support via `ramp` references on every dimensional token.

**Evidence:**
- `\`button.size:small.minimum.height = {core.minimum-height.100}\` (40px) (\`common/design-tokens/tokens/components/button.json:50\`)`
- `\`button.size:{small,medium,large}.minimum.width.multiplier.value = 1.5\` (\`common/design-tokens/tokens/components/button.json:45\`)`
- `Every dimensional token carries a \`ramp\` field (\`{core.ramp.spacing-200}\`, \`{core.ramp.min-height-100}\`) for dynamic-type scaling (\`common/design-tokens/tokens/core/metrics.json:28\`)`

### Motion
Animation is parameterized as a 3×3 matrix: three direction curves (`enter`, `exit`, `move`) with three speeds (`fast: 100ms`, `moderate: 160–240ms`, `slow: 300–400ms`). The easings are asymmetric — enter uses `cubic-bezier(0.26, 0.10, 0.48, 1.0)` (decelerating), exit uses `cubic-bezier(0.52, 0.0, 0.74, 0.0)` (accelerating), move uses `cubic-bezier(0.76, 0.0, 0.24, 1.0)` (in-out). There are no spring tokens, no per-component motion tokens, and no animation-amount tokens — motion is opt-in by reference to one of nine curves.

**Evidence:**
- `\`core.animation.transition:enter.easing = cubic-bezier(0.26, 0.10, 0.48, 1.0)\` (\`common/design-tokens/tokens/core/animation.json:5\`)`
- `\`transition:exit.speed:moderate = 160ms\` vs \`transition:enter.speed:moderate = 240ms\` — exit is faster than enter (\`common/design-tokens/tokens/core/animation.json:13,33\`)`
- `--transition-duration: var(--core-animation-enter-transition-moderate-speed-duration)\` referenced from \`market-button-base.css:4`

### State modeling
State, mode, and variant are first-class axes in the token graph: every interactive token explodes as `variant × rank × state × mode` (e.g. `button.variant:destructive.rank:secondary.state:hover.mode:dark.background.color`). This is enumerated, not computed — there is no `darken-by-10%` transform layer; each cell of the matrix has an explicit token, often referencing a sibling in the same matrix to share values. Disabled states use `core.opacity.state:disabled = 0.4` plus an explicit muted color rather than just opacity.

**Evidence:**
- `Button has 30 background-color tokens (3 ranks × 5 states × 2 modes) per variant, repeated for \`normal\` and \`destructive\` variants (\`common/design-tokens/tokens/components/button.json:238..1337\`)`
- `\`core.opacity.state:disabled = 0.4\`, others (\`normal/hover/pressed = 1.0\`) (\`common/design-tokens/tokens/core/opacity.json:4\`)`
- `Hover states reference normal-state border color rather than shifting hue: \`border.color = {button.variant:normal.rank:primary.state:normal.mode:light.border.color.value}\` (\`common/design-tokens/tokens/components/button.json:284\`)`

### Theming architecture
Themes are sparse JSON overlay packages keyed off the base token graph. Each of the nine themes (`buyer-facing`, `cxf-large`, `cxf-large-monochrome`, `monochrome`, `noho-tokens`, `s3-monochrome-tokens`, `s3-tokens`, `starter-theme`, `tidal`) ships only the diffs from base — buyer-facing overrides button padding and type ramps; monochrome overrides emphasis-fill and per-component fill colors; tidal overrides only dark-mode opacity-based fills and button corner radii. Style Dictionary then re-runs the build per theme, producing a parallel `dist/{css,js,kotlin,swift,xml}` per theme package.

**Evidence:**
- `9 theme packages under \`common/themes/*\` each shipping \`tokens/overrides/*.json\` plus generated \`dist/\` (verified by directory listing)`
- `Buyer-facing button-large min-height = 72 (vs base 64) and uses \`heading.20\` font for button text (\`common/themes/buyer-facing/tokens/overrides/components-button.json:40\`)`
- `Monochrome \`core-color.json\` flattens emphasis-fill to \`#101010 / #FFFFFF\` and fill-* to constant grays (\`common/themes/monochrome/tokens/overrides/core-color.json:176\`)`
- `Tidal \`core-color.json\` only ships dark-mode opacity-based fills (\`common/themes/tidal/tokens/core-color.json\`)`

### Cross platform fidelity
The same token graph generates equivalent artifacts for three platforms — Stencil/CSS variables for web, `MarketDesignTokens` Swift class with `MarketDesignTokens+Component` extensions for iOS, and `MarketStyleDictionary*` Kotlin objects for Compose Android. Token names round-trip across naming conventions (kebab-case CSS → camelCase Swift/Kotlin), and the generator preserves `ramp` references for platforms that support dynamic type. Platform-specific exclusions (e.g. ripple is Android-only) are encoded in the build's matcher/filter system rather than in the token JSON.

**Evidence:**
- `\`dist/css/properties.css\`, \`dist/swift/MarketDesignTokens.swift\`, \`dist/kotlin/MarketStyleDictionary.kt\` all generated from the same \`tokens/\` graph (\`common/design-tokens/dist/\`)`
- `iOS button surface: \`extension MarketDesignTokens { public final class Button { public var smallSizeMinimumHeight: CGFloat ... } }\` (\`common/design-tokens/dist/swift/components/MarketDesignTokens+Button.swift:14\`)`
- `Android Compose: \`MarketStyleDictionaryColors\`, \`MarketStyleDictionaryDimensions\`, \`MarketStyleDictionaryAnimations\`, \`MarketStyleDictionaryTypographies\` (\`common/design-tokens/dist/kotlin/\`)`
- `Web Stencil components consume CSS vars: \`background-color: var(--button-normal-variant-primary-rank-normal-state-background-color)\` (\`web/web-components/src/components/market-button/styles/market-button-primary.css:2\`)`

# Fragments

- [embedding](embedding.md) — 49-dim vector for compare/composite/viz
