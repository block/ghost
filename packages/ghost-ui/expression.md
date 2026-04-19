---
schema: 4
id: ghost-ui
source: llm
timestamp: 2026-04-19T11:19:50.230Z
observation:
  personality:
    - monochromatic
    - editorial
    - restrained
    - pill-shaped
    - magazine-like
    - themeable
  closestSystems:
    - Vercel Geist
    - Linear
    - Apple Human Interface Guidelines
decisions:
  - dimension: color-strategy
    evidence:
      - "--background-accent: #1a1a1a (light) / #ffffff (dark) — accent is just the extremity of the gray scale"
      - "--primary: var(--background-accent) — primary maps to the achromatic accent, not a brand color"
      - "Semantic colors are the only hues: --background-danger: #f94b4b, --background-success: #91cb80, --background-info: #5c98f9, --background-warning: #fbcd44"
      - "Chart palette introduces warm/varied tones: --chart-1: #f6b44a, --chart-2: #7585ff, --chart-3: #d76a6a, --chart-4: #d185e0, --chart-5: #91cb80"
  - dimension: surface-hierarchy
    evidence:
      - "--background-default: var(--color-white), --background-alt: var(--color-gray-50), --background-muted: var(--color-gray-100), --background-medium: var(--color-gray-400), --background-inverse: var(--color-black)"
      - "--border-default: var(--color-gray-200), --border-input: var(--color-gray-300), --border-strong: var(--color-gray-900)"
      - "--text-default: var(--color-gray-900), --text-muted: var(--color-gray-500), --text-alt: var(--color-gray-600)"
      - "Dark mode inverts the mapping: --background-default: var(--color-black), --text-default: var(--color-white)"
  - dimension: shape-language
    evidence:
      - "--radius-pill: 999px, --radius-button: 999px, --radius-input: 999px"
      - "--radius-card: 20px, --radius-card-lg: 24px, --radius-card-sm: 14px"
      - "--radius-modal: 16px, --radius-dropdown: 10px"
      - Badge uses rounded-pill, Button uses rounded-full, Input uses rounded-input, Card uses rounded-card, Dialog uses rounded-modal
  - dimension: typography-voice
    evidence:
      - "--heading-display-line-height: 0.88, --heading-display-letter-spacing: -0.05em, --heading-display-font-weight: 900"
      - "--heading-section-line-height: 0.95, --heading-section-letter-spacing: -0.035em"
      - "--body-reading-line-height: 1.65, --body-reading-letter-spacing: -0.01em"
      - "--label-font-size: 11px, --label-letter-spacing: 0.12em, --label-font-weight: 600 — uppercase kicker type"
      - "--pullquote-weight: 300, --pullquote-line-height: 1.3 — light-weight contrast voice for editorial punctuation"
  - dimension: elevation
    evidence:
      - "--shadow-mini: 0 2px 8px rgba(76, 76, 76, 0.15) (light) / 0 2px 8px rgba(0, 0, 0, 0.4) (dark)"
      - "--shadow-card: 0 2px 8px rgba(76, 76, 76, 0.15), --shadow-elevated: 0 3px 12px rgba(76, 76, 76, 0.22)"
      - "--shadow-popover: 0 8px 30px rgba(0, 0, 0, 0.12), --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.2)"
      - Card applies hover:shadow-card as an interaction cue; Dialog uses shadow-modal for overlay depth
  - dimension: spatial-system
    evidence:
      - "Button sizes: h-9 (36px default), h-8 (32px sm), h-10 (40px lg)"
      - "Input height: h-9 (36px)"
      - "--spacing-input: 3.25rem (52px), --spacing-button: 2.75rem (44px) — explicit height tokens"
      - Card gap-6 py-6 px-6 (24px internal rhythm)
      - "--section-padding-vertical: 100px, --section-heading-margin-bottom: 75px — generous page-level whitespace"
  - dimension: motion
    evidence:
      - "--duration-fast: 0.15s, --duration-normal: 0.2s, --duration-slow: 0.4s"
      - "--ease-spring: cubic-bezier(0.33, 1, 0.68, 1)"
      - scale-in keyframe uses rotateX(-10deg) scale(0.9) → rotateX(0deg) scale(1) — a perspective-aware entrance
      - "word-reveal keyframe: blur(8px) + translateY(10px) → clear — editorial text entrance"
      - No spring/bounce/elastic animations defined; no decorative hover micro-animations in tokens
  - dimension: theming-architecture
    evidence:
      - "--primary: var(--background-accent) — Tailwind layer aliases into semantic layer"
      - "--background: var(--background-default), --foreground: var(--text-default)"
      - PRESETS array includes 'warm-sand', 'ocean', 'midnight-luxe', 'neon-brutalist', 'soft-pastel' — each overrides all semantic color variables
      - Neon Brutalist preset overrides all --radius-* to 0px, demonstrating shape is also themeable
  - dimension: interactive-patterns
    evidence:
      - "Button: focus-visible:ring-ring/50 focus-visible:ring-[1px]"
      - "Input: focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px]"
      - "Badge: focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px]"
      - "--ring: var(--border-strong) — resolves to #1a1a1a (light) / #ffffff (dark)"
      - "Global rule: *:not(body):focus-visible applies ring-2 ring-offset-1 as baseline"
  - dimension: density
    evidence:
      - Button default h-9 (36px), Badge px-2 py-0.5 (8px / 2px)
      - Card gap-6 py-6 px-6 (24px rhythm)
      - "--section-padding-vertical: 100px, --section-heading-margin-bottom: 75px"
      - "--page-container-max-width: 1440px, --page-container-side-gutter: 20px"
      - "--body-reading-size: clamp(1rem, 1.3vw, 1.25rem) — optimized for longform reading"
palette:
  dominant:
    - role: primary
      value: "#1a1a1a"
      oklch:
        - 0.218
        - 0
        - 89.9
    - role: background
      value: "#ffffff"
      oklch:
        - 1
        - 0
        - 89.9
    - role: inverse
      value: "#000000"
      oklch:
        - 0
        - 0
        - 0
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
      oklch:
        - 1
        - 0
        - 89.9
    - role: surface-alt
      value: "#f5f5f5"
      oklch:
        - 0.97
        - 0
        - 89.9
    - role: surface-muted
      value: "#f0f0f0"
      oklch:
        - 0.955
        - 0
        - 89.9
    - role: surface-dark
      value: "#0a0a0a"
      oklch:
        - 0.145
        - 0
        - 89.9
    - role: danger
      value: "#f94b4b"
      oklch:
        - 0.661
        - 0.211
        - 25
    - role: success
      value: "#91cb80"
      oklch:
        - 0.784
        - 0.119
        - 138.8
    - role: info
      value: "#5c98f9"
      oklch:
        - 0.684
        - 0.157
        - 259.6
    - role: warning
      value: "#fbcd44"
      oklch:
        - 0.866
        - 0.156
        - 89.6
    - role: text-default
      value: "#1a1a1a"
      oklch:
        - 0.218
        - 0
        - 89.9
    - role: text-muted
      value: "#999999"
      oklch:
        - 0.683
        - 0
        - 89.9
    - role: text-alt
      value: "#666666"
      oklch:
        - 0.51
        - 0
        - 89.9
    - role: border-default
      value: "#e8e8e8"
      oklch:
        - 0.931
        - 0
        - 89.9
    - role: border-input
      value: "#e5e5e5"
      oklch:
        - 0.922
        - 0
        - 89.9
    - role: border-strong
      value: "#1a1a1a"
      oklch:
        - 0.218
        - 0
        - 89.9
    - role: chart-1
      value: "#f6b44a"
      oklch:
        - 0.813
        - 0.142
        - 75.9
    - role: chart-2
      value: "#7585ff"
      oklch:
        - 0.663
        - 0.18
        - 274.8
    - role: chart-3
      value: "#d76a6a"
      oklch:
        - 0.653
        - 0.137
        - 21.6
    - role: chart-4
      value: "#d185e0"
      oklch:
        - 0.727
        - 0.151
        - 320.8
    - role: chart-5
      value: "#91cb80"
      oklch:
        - 0.784
        - 0.119
        - 138.8
  saturationProfile: muted
  contrast: high
spacing:
  scale:
    - 2
    - 4
    - 6
    - 8
    - 12
    - 16
    - 20
    - 24
    - 32
    - 36
    - 40
    - 52
    - 75
    - 100
  regularity: 0.8
  baseUnit: 4
typography:
  families:
    - system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
    - Geist Mono, monospace
    - HK Grotesk
  sizeRamp:
    - 10
    - 11
    - 12
    - 14
    - 16
    - 18
    - 20
    - 28
    - 40
    - 64
    - 96
  weightDistribution:
    "300": 1
    "400": 5
    "600": 4
    "700": 3
    "900": 1
  lineHeightPattern: tight
surfaces:
  borderRadii:
    - 10
    - 14
    - 16
    - 20
    - 24
    - 999
  shadowComplexity: layered
  borderUsage: moderate
---

# Character

A monochromatic, magazine-inspired design system that treats color as communication rather than decoration. The default palette is entirely achromatic — near-black on white — with hue reserved exclusively for semantic states and chart data. Pill-shaped interactive elements contrast with moderately rounded containers, and display typography pushes extreme negative tracking and ultra-tight line-heights for an editorial, high-fashion feel. It is maximally themeable at runtime through CSS custom property injection, with five bundled preset themes that prove the base architecture's range.

# Signature

- Achromatic by default — no brand hue; primary/accent is near-black (#1a1a1a) in light mode and white in dark mode, so the system is color-agnostic until a theme preset is applied
- Pill-first radius philosophy — buttons, inputs, and badges are all fully rounded (999px) while structural containers use moderate radii, creating a visual split between actionable and structural surfaces
- Magazine-scale display typography with line-heights as low as 0.85 and letter-spacing at -0.05em, paired with uppercase label type at 0.12em tracking — an editorial spread aesthetic
- Shadow hierarchy named by role (mini, card, elevated, popover, modal) rather than numeric size, with dark mode doubling intensity rather than removing shadows
- Runtime-themeable architecture: a semantic variable layer maps to a Tailwind mapping layer, allowing complete visual transformation (5 bundled preset themes) without touching component code
- Notable absence of gradient tokens, illustration tokens, or brand-specific iconography guidance

# Decisions

### Color strategy
Treat hue as opt-in communication, not ambient decoration — the default theme is pure achromatic, so every bit of chromatic color that appears carries semantic meaning (danger, success, info, warning). Brand personality is expressed through luminance contrast and shape rather than a signature hue, which makes the system maximally themeable without color conflicts.

### Surface hierarchy
Name surfaces by intent rather than by shade number — backgrounds, borders, and text each have their own semantic vocabulary (default, alt, muted, medium, inverse, accent) decoupling usage intent from visual weight, so a theme preset can remap all values without breaking component logic.

### Shape language
Apply a pill-first radius philosophy that visually separates interactive elements from structural containers — buttons, inputs, and badges fully round to 999px, while cards, modals, and dropdowns use moderate radii (10–24px), so users intuit what is tappable versus what is a surface.

### Typography voice
Use a magazine-scale type hierarchy where display headings are dramatically tight (sub-1.0 line-heights, heavy negative tracking) and body text is relaxed for long-form readability, creating an editorial rhythm that alternates between bold visual impact and comfortable reading.

### Elevation
Name shadows by their structural role rather than by intensity level, and double shadow opacity in dark mode rather than removing them — this ensures depth cues remain legible on dark surfaces while giving designers a vocabulary tied to component context.

### Spatial system
Prefer explicit component-height tokens over padding arithmetic, so button/input sizing is decoupled from content and surrounding spacing — interactive elements declare fixed heights (h-8, h-9, h-10) and containers use generous internal padding (p-6), creating a compact-controls / spacious-layout rhythm.

### Motion
Keep transitions functional and brief — three duration tiers (fast/normal/slow) with a single spring easing. Animations exist for structural reveals (accordion, scale-in, fade) and entrance transitions but not for decorative micro-interactions, keeping the editorial tone serious.

### Theming architecture
Separate a semantic variable layer from a Tailwind mapping layer, so the entire visual language can be swapped at runtime through CSS custom property injection without modifying component code — proven by five built-in theme presets that override 30+ variables each.

### Interactive patterns
Standardize focus states as a subtle 1px ring at half opacity using the ring-ring token, applied uniformly across all interactive elements — this replaces browser default outlines with a consistent, brand-aware focus indicator that works in both light and dark modes.

### Density
Maintain compact interactive controls inside generous structural whitespace — buttons and inputs are small (32–40px height range, text-sm body) while page sections and cards use lavish padding (100px vertical sections, 24px card padding), creating a publishing-oriented reading rhythm rather than a dense tool-UI feel.

# Fragments

- [embedding](embedding.md) — 49-dim vector for compare/fleet/viz
