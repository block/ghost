---
id: ghost-ui
source: llm
timestamp: 2026-04-20T00:00:00Z
observation:
  personality:
    - monochromatic
    - editorial
    - restrained
    - pill-shaped
    - magazine-like
    - themeable
  resembles:
    - Vercel Geist
    - Linear
    - Apple Human Interface Guidelines
decisions:
  - dimension: color-strategy
  - dimension: surface-hierarchy
  - dimension: shape-language
  - dimension: typography-voice
  - dimension: elevation
  - dimension: spatial-system
  - dimension: motion
  - dimension: theming-architecture
  - dimension: interactive-patterns
  - dimension: density
  - dimension: font-sourcing
rules:
  - id: no-off-palette-hex
    canonical: color-strategy
    kind: color
    summary: Hex literals must come from the documented palette
    rationale: >-
      Default theme is achromatic — chromatic colors are reserved for
      semantic states (danger, success, info, warning) and chart data.
      Any new hex literal is drift unless it lands in the palette.
    pattern: '#[0-9a-fA-F]{3,8}'
    enforce_at: [className, css_var, inline_style]
    support: 0.94
  - id: pill-interactives
    canonical: shape-language
    kind: radius
    summary: Buttons, inputs, and badges must be fully rounded
    rationale: >-
      Pill-first radius philosophy separates interactive from structural
      surfaces — interactive elements fully round (999px), while cards and
      modals use moderate radii (10–24px).
    pattern: '<(Button|Input|Badge)\b[^>]*\brounded-(?!full|pill)'
    enforce_at: [className]
    support: 0.97
  - id: structural-radius-set
    canonical: shape-language
    kind: radius
    summary: Container radii must come from the canonical set
    rationale: >-
      Cards, modals, and dropdowns use moderate radii (10–24px).
      Arbitrary radius values break the shape vocabulary.
    pattern: 'rounded-\[\d+px\]|border-radius:\s*\d+px'
    support: 0.91
  - id: no-foreign-fonts
    canonical: font-sourcing
    kind: type-family
    summary: Do not bundle additional typefaces
    rationale: >-
      Library ships no bundled fonts — system-ui sans, Geist Mono, and a
      generic serif fallback. Adding @font-face or importing a webfont
      crosses the font-sourcing decision.
    pattern: '@import\s+url\([^)]*fonts'
    enforce_at: [css_var, inline_style]
    presence_floor: 0
    support: 1.0
  - id: type-on-ramp
    canonical: typography-voice
    kind: type-size
    summary: Font sizes must come from the magazine ramp
    rationale: >-
      Type ramp runs from 10px (label kicker) to 96px (display). Sizes
      outside the ramp break the editorial rhythm.
    pattern: 'text-\[\d+px\]|font-size:\s*\d+px'
    support: 0.93
  - id: no-decorative-motion
    canonical: motion
    kind: motion
    summary: No decorative or hover-only animations
    rationale: >-
      Animations exist for structural reveals (accordion, scale-in, fade)
      and entrance transitions, never for decorative micro-interactions.
      The editorial tone stays serious.
    pattern: 'transition:\s*all\b|animate-(?!none)\w+'
    presence_floor: 4
    support: 0.86
  - id: spacing-on-scale
    canonical: spatial-system
    kind: spacing
    summary: Padding, margin, and gap must come from the 4px-base scale
    rationale: >-
      Scale is 2/4/6/8/12/16/20/24/32/36/40/52/75/100. Off-scale spacing
      breaks the layout rhythm; small drift (±2px) is tolerated.
    pattern: '\b(p|m|gap)-\[\d+px\]'
    support: 0.88
palette:
  dominant:
    - role: primary
      value: "#1a1a1a"
      oklch: [0.218, 0, 89.9]
    - role: background
      value: "#ffffff"
      oklch: [1, 0, 89.9]
    - role: inverse
      value: "#000000"
      oklch: [0, 0, 0]
  neutrals:
    steps:
      - "#ffffff"
      - "#f5f5f5"
      - "#f0f0f0"
      - "#e8e8e8"
      - "#e5e5e5"
      - "#cccccc"
      - "#999999"
      - "#666666"
      - "#333333"
      - "#232323"
      - "#1a1a1a"
      - "#000000"
    count: 12
  semantic:
    - role: surface-default
      value: "#ffffff"
      oklch: [1, 0, 89.9]
    - role: surface-alt
      value: "#f5f5f5"
      oklch: [0.97, 0, 89.9]
    - role: surface-muted
      value: "#f0f0f0"
      oklch: [0.955, 0, 89.9]
    - role: surface-dark
      value: "#0a0a0a"
      oklch: [0.145, 0, 89.9]
    - role: danger
      value: "#f94b4b"
      oklch: [0.661, 0.211, 25]
    - role: success
      value: "#91cb80"
      oklch: [0.784, 0.119, 138.8]
    - role: info
      value: "#5c98f9"
      oklch: [0.684, 0.157, 259.6]
    - role: warning
      value: "#fbcd44"
      oklch: [0.866, 0.156, 89.6]
    - role: text-default
      value: "#1a1a1a"
      oklch: [0.218, 0, 89.9]
    - role: text-muted
      value: "#999999"
      oklch: [0.683, 0, 89.9]
    - role: text-alt
      value: "#666666"
      oklch: [0.51, 0, 89.9]
    - role: border-default
      value: "#e8e8e8"
      oklch: [0.931, 0, 89.9]
    - role: border-input
      value: "#e5e5e5"
      oklch: [0.922, 0, 89.9]
    - role: border-strong
      value: "#1a1a1a"
      oklch: [0.218, 0, 89.9]
    - role: chart-1
      value: "#f6b44a"
      oklch: [0.813, 0.142, 75.9]
    - role: chart-2
      value: "#7585ff"
      oklch: [0.663, 0.18, 274.8]
    - role: chart-3
      value: "#d76a6a"
      oklch: [0.653, 0.137, 21.6]
    - role: chart-4
      value: "#d185e0"
      oklch: [0.727, 0.151, 320.8]
    - role: chart-5
      value: "#91cb80"
      oklch: [0.784, 0.119, 138.8]
  saturationProfile: muted
  contrast: high
spacing:
  scale: [2, 4, 6, 8, 12, 16, 20, 24, 32, 36, 40, 52, 75, 100]
  regularity: 0.8
  baseUnit: 4
typography:
  families:
    - system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
    - Geist Mono, monospace
    - serif
  sizeRamp: [10, 11, 12, 14, 16, 18, 20, 28, 40, 64, 96]
  weightDistribution:
    "300": 1
    "400": 5
    "600": 4
    "700": 3
    "900": 1
  lineHeightPattern: tight
surfaces:
  borderRadii: [10, 14, 16, 20, 24, 999]
  shadowComplexity: layered
  borderUsage: moderate
---

# Character

A monochromatic, magazine-inspired design language that treats color as communication rather than decoration. The default palette is entirely achromatic — near-black on white — with hue reserved for semantic states and chart data. Pill-shaped interactive elements contrast with moderately rounded containers, and display typography pushes ultra-tight line-heights (0.85–0.88) with heavy negative tracking for an editorial spread aesthetic. It ships no bundled typefaces and is fully themeable at runtime through CSS custom property injection, with five non-default preset themes that prove the base architecture's range.

# Decisions

### color-strategy

Treat hue as opt-in communication, not ambient decoration — the default theme is pure achromatic, so every bit of chromatic color that appears carries semantic meaning (danger, success, info, warning, chart). Brand personality is expressed through luminance contrast and shape, which makes the system maximally themeable without color conflicts.

**Evidence:**
- `--color-gray-50: #f5f5f5 through --color-gray-900: #1a1a1a (pure monochromatic scale, src/styles/main.css:16-25)`
- `--color-white: #ffffff, --color-black: #000000 (src/styles/main.css:12-13)`
- `--background-accent: var(--color-gray-900) — accent maps to the extremity of the gray scale, not a brand hue`
- `Chromatic tokens reserved for state: --color-red-200: #f94b4b, --color-green-200: #91cb80, --color-blue-200: #5c98f9, --color-yellow-200: #fbcd44`
- `Chart palette introduces warm/varied hues only for data: --chart-1: #f6b44a, --chart-2: #7585ff, --chart-3: #d76a6a, --chart-4: #d185e0, --chart-5: #91cb80`

### surface-hierarchy

Name surfaces by intent rather than by shade number — backgrounds, borders, and text each have their own semantic vocabulary (default, alt, muted, medium, inverse, accent, strong) decoupling usage intent from visual weight. A theme preset can remap all values without breaking component logic.

**Evidence:**
- `--background-default: var(--color-white), --background-alt: var(--color-gray-50) (#f5f5f5), --background-muted: var(--color-gray-100) (#f0f0f0), --background-medium: var(--color-gray-400) (#cccccc), --background-inverse: var(--color-black)`
- `--border-default: var(--color-gray-200) (#e8e8e8), --border-input: var(--color-gray-300) (#e5e5e5), --border-strong: var(--color-gray-900) (#1a1a1a)`
- `--text-default: var(--color-gray-900), --text-alt: var(--color-gray-600) (#666666), --text-muted: var(--color-gray-500) (#999999)`
- `Dark mode inverts the mapping at .dark scope: --background-default: var(--color-black), --text-default: var(--color-white) (src/styles/main.css:228-253)`
- `Dark-mode mids draw from --color-gray-700 (#333333) and --color-gray-800 (#232323) for borders and alt surfaces (src/styles/main.css:229-240)`
- `--surface-dark: #0a0a0a is reserved for dark surface treatments regardless of mode`

### shape-language

Apply a pill-first radius philosophy that visually separates interactive from structural surfaces — buttons, inputs, and badges fully round to 999px, while cards, modals, and dropdowns use moderate radii (10–24px). Users intuit what is tappable versus what is container.

**Evidence:**
- `--radius-pill: 999px, --radius-button: 999px, --radius-input: 999px`
- `--radius-card: 20px, --radius-card-lg: 24px, --radius-card-sm: 14px, --radius-modal: 16px, --radius-dropdown: 10px`
- `Button: rounded-full (src/components/ui/button.tsx:7)`
- `Badge: rounded-pill (src/components/ui/badge.tsx:8)`
- `Input: rounded-input (src/components/ui/input.tsx:11)`
- `Card: rounded-card (src/components/ui/card.tsx:10)`

### typography-voice

Use a magazine-scale type hierarchy where display headings are dramatically tight (sub-1.0 line-heights, heavy negative tracking) and body text is relaxed for long-form readability. The rhythm alternates between bold editorial impact and comfortable reading, with uppercase label type providing a byline voice between them.

**Evidence:**
- `--heading-display-font-size: clamp(64px, 8vw, 96px), line-height 0.88, letter-spacing -0.05em, weight 900`
- `--heading-section-font-size: clamp(44px, 5vw, 64px), line-height 0.95, letter-spacing -0.035em, weight 700`
- `--display-size: clamp(3rem, 12vw, 12rem), line-height 0.85, letter-spacing -0.05em`
- `--body-reading-size: clamp(1rem, 1.3vw, 1.25rem), line-height 1.65, letter-spacing -0.01em`
- `--label-font-size: 11px, letter-spacing 0.12em, weight 600 — uppercase kicker type`
- `--pullquote-weight: 300, line-height 1.3 — light contrast voice for editorial punctuation`
- `CardTitle uses font-display with tracking-[-0.01em] (src/components/ui/card.tsx:36)`

### elevation

Name shadows by structural role rather than by intensity level, and double shadow opacity in dark mode rather than removing them. Depth cues stay legible on dark surfaces, and designers get a vocabulary tied to component context instead of a numeric scale.

**Evidence:**
- `--shadow-mini: 0 2px 8px rgba(76, 76, 76, 0.15); --shadow-btn, --shadow-card, --shadow-kbd share the mini tier`
- `--shadow-elevated: 0 3px 12px rgba(76, 76, 76, 0.22), --shadow-popover: 0 8px 30px rgba(0, 0, 0, 0.12), --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.2)`
- `Dark mode doubles intensity: --shadow-mini: 0 2px 8px rgba(0, 0, 0, 0.4), --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.6) (src/styles/main.css:268-275)`
- `Card applies hover:shadow-card as an interaction cue (src/components/ui/card.tsx:10)`

### spatial-system

Prefer explicit component-height tokens over padding arithmetic — interactive elements declare fixed heights (h-8, h-9, h-10) and containers use generous internal padding (24px card rhythm). Button/input sizing is decoupled from surrounding layout, yielding a compact-controls / spacious-layout composition.

**Evidence:**
- `Button sizes: h-9 (36px default), h-8 (32px sm), h-10 (40px lg) (src/components/ui/button.tsx:20-22)`
- `Input height: h-9 (36px) (src/components/ui/input.tsx:11)`
- `--spacing-input: 3.25rem (52px), --spacing-input-sm: 2.75rem (44px), --spacing-button: 2.75rem (44px), --spacing-button-sm: 2rem (32px)`
- `Card gap-6 py-6, CardHeader/CardContent px-6 — uniform 24px internal rhythm`
- `--section-padding-vertical: 100px, --section-heading-margin-bottom: 75px, --page-container-max-width: 1440px`

### motion

Keep transitions functional and brief — three duration tiers (fast/normal/slow) with a single spring easing. Animations exist for structural reveals (accordion, scale-in, fade, word-reveal) and entrance transitions, not for decorative micro-interactions — the editorial tone stays serious.

**Evidence:**
- `--duration-fast: 0.15s, --duration-normal: 0.2s, --duration-slow: 0.4s`
- `--ease-spring: cubic-bezier(0.33, 1, 0.68, 1) — single easing for all transitions`
- `@keyframes scale-in: rotateX(-10deg) scale(0.9) → rotateX(0deg) scale(1) — perspective-aware entrance`
- `@keyframes word-reveal: blur(8px) translateY(10px) → clear — editorial text entrance`
- `@keyframes accordion-down/up, fade-in/out, scale-in/out, enter/exit-from-left/right — all structural, no decorative hovers`

### theming-architecture

Cascade three layers — semantic variables → shadcn aliases → Tailwind `@theme inline` — so the entire visual language can be swapped at runtime through CSS custom property injection without modifying component code. Six bundled presets (default plus five overrides) validate that shape, color, and contrast can all be remapped.

**Evidence:**
- `Layered cascade: --background-accent (semantic) → --primary: var(--background-accent) (shadcn alias) → --color-primary: var(--primary) (@theme inline Tailwind mapping)`
- `PRESETS array defines 6 themes: default, warm-sand, ocean, midnight-luxe, neon-brutalist, soft-pastel (src/lib/theme-presets.ts)`
- `Neon Brutalist preset overrides every --radius-* to 0px, demonstrating shape is also themeable`
- `Dark mode cascades through the same semantic variables — component code never branches on theme`
- `src/styles/main.css:9 resets --color-*: initial so only declared tokens emit Tailwind colors`

### interactive-patterns

Standardize focus states as a subtle 1px ring at half opacity using the ring-ring token, applied uniformly across Button/Input/Badge and reinforced by a global `*:focus-visible` fallback. Browser default outlines are replaced with a consistent, theme-aware indicator that works in both light and dark modes.

**Evidence:**
- `Button: focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] (src/components/ui/button.tsx:7)`
- `Input: focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] (src/components/ui/input.tsx:12)`
- `Badge: focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] (src/components/ui/badge.tsx:8)`
- `--ring: var(--border-strong) — resolves to #1a1a1a (light) / #ffffff (dark)`
- `Global fallback: *:not(body):not(.focus-override):focus-visible applies ring-2 ring-offset-1 (src/styles/main.css:657-662)`

### density

Maintain compact interactive controls inside generous structural whitespace — buttons and inputs sit in a 32–40px height range with text-sm bodies, while page sections and cards use lavish padding (100px vertical sections, 24px card rhythm). The result is a publishing-oriented reading rhythm, not a dense tool-UI feel.

**Evidence:**
- `Compact controls: Button h-9 (36px), Badge px-2 py-0.5 (8px/2px), Input h-9`
- `Spacious containers: Card gap-6 py-6 px-6 (24px rhythm)`
- `--section-padding-vertical: 100px, --section-heading-margin-bottom: 75px — editorial page whitespace`
- `--body-reading-size: clamp(1rem, 1.3vw, 1.25rem), line-height 1.65 — longform reading optimization`
- `Text scale runs 10px up to 96px (11 tiers) but body copy stays at text-sm (14px) for UI chrome`

### font-sourcing

Ship no bundled typefaces. The system declares a system-ui sans stack, `Geist Mono` with a monospace fallback, and a generic `serif` — typography responsibility moves to the consumer. The visual language adapts to the host platform's default face, which keeps the library dependency-free and lets hosts impose their own brand font without overriding.

**Evidence:**
- `src/styles/font-faces.css is intentionally empty: /* Design language ships with no bundled fonts — consumers bring their own. */`
- `--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif (src/styles/main.css:367)`
- `--font-display aliases the sans stack — no separate display face is assumed`
- `--font-mono: "Geist Mono", monospace — named preference with generic fallback`
- `--font-serif: serif — generic fallback only`

# Fragments

- [embedding](embedding.md) — 49-dim vector for compare/composite/viz
