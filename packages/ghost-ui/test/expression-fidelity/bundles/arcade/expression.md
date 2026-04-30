---
id: arcade
source: llm
timestamp: 2026-04-28T00:00:00Z
sources:
  - github:squareup/cash-design-system
observation:
  personality:
    - utilitarian
    - monetary
    - mode-rich
    - high-contrast
    - dense
    - branded-but-restrained
  resembles:
    - material-3
    - ios-system
decisions:
  - dimension: color-strategy
  - dimension: appearance-modes
  - dimension: spatial-system
  - dimension: surface-hierarchy
  - dimension: elevation
  - dimension: typography-voice
  - dimension: numeric-display
  - dimension: semantic-density
  - dimension: product-identity
  - dimension: token-architecture
  - dimension: motion
  - dimension: legacy-handling
  - dimension: playground-divergence
palette:
  dominant:
    - role: brand
      value: "#00D64F"
      oklch:
        - 0.763
        - 0.227
        - 147
    - role: brand-dark
      value: "#00BD46"
      oklch:
        - 0.696
        - 0.206
        - 147.1
    - role: ink
      value: "#000000"
      oklch:
        - 0
        - 0
        - 0
    - role: paper
      value: "#FFFFFF"
      oklch:
        - 1
        - 0
        - 89.9
  neutrals:
    steps:
      - "#FFFFFF"
      - "#F0F0F0"
      - "#E8E8E8"
      - "#CCCCCC"
      - "#878787"
      - "#000000"
    count: 6
  semantic:
    - role: danger
      value: "#D3040E"
      oklch:
        - 0.546
        - 0.222
        - 28.2
    - role: danger-dark
      value: "#F84752"
      oklch:
        - 0.657
        - 0.213
        - 22.1
    - role: warning
      value: "#CC4B03"
      oklch:
        - 0.582
        - 0.176
        - 41.4
    - role: success
      value: "#00792C"
      oklch:
        - 0.502
        - 0.147
        - 147.6
    - role: info
      value: "#007CC1"
      oklch:
        - 0.565
        - 0.139
        - 244.1
    - role: link-visited
      value: "#660199"
      oklch:
        - 0.4
        - 0.204
        - 307.8
    - role: notification
      value: "#D7040E"
      oklch:
        - 0.553
        - 0.225
        - 28.3
    - role: bitcoin
      value: "#00D4FF"
      oklch:
        - 0.804
        - 0.146
        - 219.5
    - role: investing
      value: "#9013FE"
      oklch:
        - 0.553
        - 0.289
        - 298.9
    - role: taxes
      value: "#5D00E8"
      oklch:
        - 0.47
        - 0.273
        - 285.7
    - role: borrow
      value: "#3399FF"
      oklch:
        - 0.676
        - 0.176
        - 252.3
    - role: avatar-turquoise
      value: "#41EBC1"
      oklch:
        - 0.845
        - 0.149
        - 172
    - role: avatar-pink
      value: "#FB60C4"
      oklch:
        - 0.718
        - 0.215
        - 344.2
    - role: avatar-sunshine
      value: "#FADA3D"
      oklch:
        - 0.89
        - 0.167
        - 97
    - role: avatar-amber
      value: "#F46E38"
      oklch:
        - 0.693
        - 0.178
        - 41
    - role: avatar-purple
      value: "#B141FF"
      oklch:
        - 0.622
        - 0.265
        - 306.9
  saturationProfile: mixed
  contrast: high
spacing:
  scale:
    - 4
    - 8
    - 16
    - 32
    - 64
  regularity: 1
  baseUnit: 4
typography:
  families:
    - CashSans
    - CashSansMono
  sizeRamp:
    - 10
    - 11
    - 12
    - 14
    - 16
    - 24
    - 28
    - 32
    - 44
    - 56
    - 96
  weightDistribution:
    "400": 9
    "500": 16
    "600": 2
  lineHeightPattern: tight
surfaces:
  borderRadii:
    - 6
    - 8
    - 16
    - 24
    - 40
    - 9999
  shadowComplexity: deliberate-none
  borderUsage: moderate
---

# Character

Arcade is the visual language Cash App ships across every surface — phones, web, server-rendered email, and CDN — authored once as a YAML graph and fanned out through Style Dictionary. Read end-to-end, the language reads as utilitarian and monetary: a grayscale stage with a single saturated Cash Green for brand, a wide semantic vocabulary of warnings/states/services, and an unusually rich set of *appearance modes* (light, dark, P3 wide-gamut, light-mono, dark-mono) that the system treats as a first-class product axis rather than a theme switch. Heaviness is achieved by inversion (black on white, white on black) instead of by elevation; depth is layered greys, never shadow. The brand is loud where money is happening — keypad, brand surface, toggle-on — and quiet everywhere else.

# Decisions

### Color strategy
Brand-as-accent, inverse-as-prominent. The most prominent surface is not the brand color — `prominent.background` resolves to `semantic.background.inverse` (black in light, white in dark), and Cash Green is reserved for `semantic.background.brand` / `border.brand` / `text.brand` / `icon.brand`, plus the keypad surface and toggle-on state. The rest of the app rides on a deep grey ramp punctuated by saturated semantic states.

**Evidence:**
- `design-tokens/arcade/component/mobile/button.yaml:6\` — \`prominent.background.default = semantic.color.background.inverse`
- `design-tokens/arcade/semantic/color.yaml:67\` — \`text.brand → base.color.brand.cash-green`
- `design-tokens/arcade/semantic/color.yaml:237\` — \`background.brand → base.color.brand.cash-green`
- `base.color.brand.cash-green.light = #00D64F`
- `base.color.brand.cash-green.dark = #00BD46`
- `base.color.constant.black = #000000`
- `base.color.constant.white = #FFFFFF`

### Appearance modes
Five appearance modes are first-class outputs, not runtime overlays. Every brand-touching token declares `light`, `dark`, optional `lightP3`, and a parallel `lightMono` / `darkMono` pair. Style Dictionary emits separate artifacts per mode (`colors-mono.ts`, `colors-pre-mono.ts`, `ArcadeColorMapping+LightP3.swift`, `+LightMono.swift`, `+DarkMono.swift`); the mono variant deliberately removes brand color from the system rather than re-tinting it. Modes are a generator concern, not a CSS concern.

**Evidence:**
- `\`generators/ios/config.yaml:24\` — \`+LightP3.swift\` / \`+LightMono.swift\` / \`+DarkMono.swift\` filtered outputs`
- `\`generators/web/config.yaml:11\` — \`colors-mono.ts\` / \`colors-pre-mono.ts\` web outputs`
- `\`design-tokens/arcade/mono/component-button.yaml:6\` — \`lightMono\` strips brand to grey on prominent button`
- `\`design-tokens/arcade/p3/semantic-color.yaml:1\` — \`lightP3\` overrides for success`
- `\`packages/web/tokens/src/index.ts:2\` — \`semanticMonochrome\` / \`componentMonochrome\` named re-exports`

### Spatial system
Discrete pixel scale, no fluid grid. Spacing is six categorical slugs (`xsmall=4, small=8, medium=16, large=32, xlarge=64`) plus a fixed `margin=16`. Values are authored as raw integers in YAML and converted to rem only at the web sink; iOS gets `CGFloat`, Android gets `dp`. Radii are categorical too — `pill=9999` and `circle='50%'` are not arithmetic, they are tokens.

**Evidence:**
- `--space-xsmall: 4`
- `--space-small: 8`
- `--space-medium: 16`
- `--space-large: 32`
- `--space-xlarge: 64`
- `--radius-pill: 9999`
- `--radius-circle: 50%`
- `design-tokens/arcade/semantic/size.yaml:28`
- `\`generators/web/config.yaml:6\` — \`size-rem\` web transform`
- `\`generators/ios/config.yaml:104\` — \`CGFloat+Arcade.swift\` ios sink`

### Surface hierarchy
Depth is a five-step neutral ramp, not a shadow stack. `background.app → subtle → standard → prominent → extra-prominent` walks the grey ladder (white→grey-95→grey-90→grey-80→grey-65 in light mode; black→grey-15→grey-25→grey-40→grey-45 in dark). Cards and inputs sit on `background.app` with a `border.subtle` hairline; pressed states swap up one step rather than animating elevation. Dimming is a single `#00000073` rgba in `ui.dimmer`.

**Evidence:**
- `--background-app-light: #FFFFFF`
- `--background-subtle-light: #F0F0F0`
- `--background-standard-light: #E8E8E8`
- `--background-prominent-light: #CCCCCC`
- `--background-extra-prominent-light: #878787`
- `design-tokens/arcade/component/mobile/card.yaml:4`
- `design-tokens/arcade/component/mobile/cell.yaml:4`
- `\`design-tokens/arcade/component/mobile/ui.yaml:19\` — \`dimmer.background\` is a single alpha-encoded black rgba`

### Elevation
There is no shadow or elevation token in the graph. Shadow appears only as an *illustration* paint (`semantic.color.illustration.shadow.standard`), used for drawing graphics, not for raising surfaces. Z-depth is communicated entirely through the surface ramp and inversion.

**Evidence:**
- `\`design-tokens/arcade/semantic/color.yaml:402\` — \`illustration.shadow.standard\` (paint, not depth)`
- `No \`shadow\` / \`elevation\` namespace in any base or semantic file`
- `surfaces.shadowComplexity: deliberate-none`

### Typography voice
Single proprietary family ("CashSans", served from `cash-f.squarecdn.com`), with `CashSansMono` reserved for `body-x-small`, `link-x-small`, and `label-x-small`. Every token declares paired iOS dynamic-type slugs (`dynamic-type-style-uikit`, `dynamic-type-style-swiftui`) so the same role survives the iOS accessibility ramp. Weights are restricted to 400 (regular) and 500 (medium); 600 (semibold) appears only on deprecated tokens, signalling the system is migrating off it.

**Evidence:**
- `apps/cabinet/app/styles/arcade.css:5\` — \`@font-face CashSans\` from \`cash-f.squarecdn.com`
- `design-tokens/arcade/base/typography.yaml:4\` — \`font.family.default = CashSans`
- `design-tokens/arcade/base/typography.yaml:7\` — \`font.family.mono = CashSansMono`
- `design-tokens/arcade/semantic/typography.yaml:14\` — \`dynamic-type-style-uikit: largeTitle\` paired on \`keypad-total`
- `design-tokens/arcade/semantic/typography.yaml:697\` — semibold (600) only on deprecated \`hero-numerics`
- `design-tokens/arcade/semantic/typography.yaml:411\` — \`body-x-small.font-family = mono`

### Numeric display
Money has its own typographic stratum. `keypad-total` (96/96), `numeral-large` (56/56), `numeral-small` (32/32) live alongside `headline-large` (44/44) and `page-title` (32/32) but collapse line-height to size for tight numeric stacking. The keypad token is at the apex of the type ramp; nothing else hits 96.

**Evidence:**
- `--type-keypad-total-size: 96`
- `--type-keypad-total-line-height: 96`
- `--type-numeral-large-size: 56`
- `--type-numeral-small-size: 32`
- `design-tokens/arcade/semantic/typography.yaml:3\` — \`keypad-total`
- `design-tokens/arcade/semantic/typography.yaml:22\` — \`numeral-large`
- `design-tokens/arcade/semantic/typography.yaml:101\` — \`numeral-small`

### Semantic density
The semantic layer is unusually wide. `text`, `icon`, `border`, `background` each carry `standard / subtle / prominent / disabled / inverse / warning / danger / success / brand` slugs; `text` adds `placeholder / link / link-visited`, `background` adds `notification / keypad / inverse-pressed`, `icon` adds `info / extra-subtle`. Component tokens almost always go through this layer — `base.*` is reached only for transparency hex literals (`#0000004D` for disabled inverse, `#FFFFFF80` for disabled-on-prominent).

**Evidence:**
- `\`design-tokens/arcade/semantic/color.yaml:1\` — \`semantic.color.text\` declares 12 slugs`
- `design-tokens/arcade/semantic/color.yaml:166\` — \`semantic.color.background\` declares 12 slugs incl. \`keypad\`, \`notification\`, \`inverse-pressed`
- `\`design-tokens/arcade/component/mobile/button.yaml:22\` — \`prominent.background.disabled\` is an alpha-encoded literal, not a semantic reference`
- `--text-danger-light: #D3040E`
- `--text-warning-light: #CC4B03`
- `--text-success-light: #00792C`
- `--icon-info-light: #007CC1`
- `--text-link-visited-light: #660199`
- `--background-notification-light: #D7040E`
- `--text-danger-dark: #F84752`

### Product identity
Product lines own named identity tokens at the semantic layer, not just brand-tinted accents. `service.bitcoin = #00D4FF`, `service.bitcoin-orange = #F78A2B`, `service.investing = #9013FE`, `service.taxes = violet.50`, `service.borrow = brand.ocean` — each money surface gets its own hue. Avatar identity is a separate, fixed nine-chip palette (turquoise, sky, ocean, royal, pink, purple, scarlet, amber, sunshine) hardcoded across light and dark.

**Evidence:**
- `design-tokens/arcade/semantic/color.yaml:316\` — \`service.bitcoin = #00D4FF`
- `design-tokens/arcade/semantic/color.yaml:351\` — \`service.investing = #9013FE`
- `design-tokens/arcade/semantic/color.yaml:358\` — \`service.taxes → violet.50 = #5D00E8`
- `design-tokens/arcade/semantic/color.yaml:344\` — \`service.borrow → brand.ocean = #3399FF`
- `\`design-tokens/arcade/component/mobile/avatar.yaml:17\` — nine-chip avatar palette`
- `--avatar-turquoise: #41EBC1`
- `--avatar-pink: #FB60C4`
- `--avatar-sunshine: #FADA3D`
- `--avatar-amber: #F46E38`
- `--avatar-purple: #B141FF`

### Token architecture
Three layers, strict references. `base/*` declares hex literals; `semantic/*` references base; `component/*/*` references semantic (and base only for transparency edge cases). Components are authored once at `component/mobile/*.yaml` and per-platform files use `extend: '{component.mobile.<name>}'` to layer additions only — `component/web/button.yaml` adds hover/focus, `component/mobile/android/button.yaml` adds ripple, `mono/component-button.yaml` adds `lightMono` / `darkMono`. The architecture composes additively, not destructively.

**Evidence:**
- `design-tokens/arcade/component/web/button.yaml:4\` — \`extend: '{component.mobile.button}'`
- `design-tokens/arcade/component/mobile/android/button.yaml:5\` — \`extend: '{component.mobile.button}'`
- `design-tokens/arcade/component/web/input.yaml:4\` — \`extend: '{component.mobile.input}'`
- `\`design-tokens/arcade/mono/component-button.yaml:1\` — overlay file targets the same path`
- `\`generators/web/config.yaml:1\` — \`arcade-cti\` + \`name-web\` + \`resolve-object-values\` transform stack`
- `\`generators/ios/config.yaml:1\` — parallel transform stack with \`attributes-ios\`, \`name-ios\`, etc.`

### Motion
Motion is a named taxonomy on iOS — and only on iOS. `motion.spring.smooth.{gentle, steady, fast, sharp, soft}` plus `motion.spring.bouncy.{error, hint, urgent}` declare stiffness/damping pairs that emit Swift, UIKit, and SwiftUI artifacts. There is no equivalent web/android motion namespace in this token graph; mobile owns the motion vocabulary, and other platforms inherit nothing.

**Evidence:**
- `design-tokens/arcade/base/ios/motion.yaml:1\` — \`motion.spring.smooth.gentle = stiffness:50, damping:14.182`
- `design-tokens/arcade/base/ios/motion.yaml:24\` — \`motion.spring.bouncy.error = stiffness:1200, damping:8.222`
- `\`generators/ios/config.yaml:114\` — \`Motion/ArcadeMotion.swift\` / \`+UIKit.swift\` / \`+SwiftUI.swift\` outputs`
- `No \`motion\` namespace under \`design-tokens/arcade/base/\` or any web sink`

### Legacy handling
Deprecation is graph-resident, not changelog-resident. Deprecated typography tokens (`meta-text`, `hero-numerics`, `large-label`, `label`, `body`, `body-link`, `cell-body`, `disclaimer`, `disclaimer-link`) keep their values inline alongside `deprecated: { value: true, replacement: <new-slug> }`, so consumers see the migration target at lookup time. The semibold (600) weight only survives on these deprecated entries.

**Evidence:**
- `design-tokens/arcade/semantic/typography.yaml:446\` — \`meta-text.deprecated.value: true, replacement: body-xs`
- `design-tokens/arcade/semantic/typography.yaml:687\` — \`hero-numerics.deprecated, replacement: numeral-l`
- `design-tokens/arcade/semantic/typography.yaml:710\` — \`large-label.deprecated, replacement: numeral-s`
- `design-tokens/arcade/semantic/typography.yaml:733\` — \`label.deprecated, replacement: label-medium`
- `design-tokens/arcade/semantic/typography.yaml:756\` — \`body.deprecated, replacement: body-medium`

### Playground divergence
The Cabinet playground that documents the system runs on default shadcn aesthetics, not Arcade. `apps/cabinet/app/components/ui/button.tsx` ships `bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90` and `bg-red-500` — generic Tailwind classes with no relation to Arcade's brand-as-accent strategy. Only the chrome around the playground (`apps/cabinet/app/styles/arcade.css`) pulls Arcade CSS variables; the showcase components themselves are unrebadged shadcn. The system declares its values with one mouth and exhibits them with another.

**Evidence:**
- `apps/cabinet/app/components/ui/button.tsx:13\` — \`bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90`
- `\`apps/cabinet/app/components/ui/button.tsx:14\` — \`bg-red-500 ... dark:bg-red-900\` (not \`--background-danger\`)`
- `apps/cabinet/app/components/ui/button.tsx:8\` — \`rounded-md\` literal, not \`--radius-medium`
- `\`apps/cabinet/app/styles/arcade.css:34\` — Arcade CSS variables only at \`:root\` level`

# Fragments

- [embedding](embedding.md) — 49-dim vector for compare/composite/viz
