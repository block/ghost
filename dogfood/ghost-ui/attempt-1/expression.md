---
id: ghost-ui
source: llm
timestamp: 2026-04-29T13:55:00Z
sources:
  - github:block/ghost#packages/ghost-ui

observation:
  personality: [monochromatic, editorial, generous, restrained, deliberate]
  resembles: [vercel-geist, linear]

decisions:
  - dimension: color-strategy
  - dimension: shape-language
  - dimension: typography-voice
  - dimension: token-architecture
  - dimension: theming
  - dimension: motion
  - dimension: shadow-hierarchy

palette:
  dominant:
    - { role: ink, value: "#1a1a1a" }
  neutrals:
    steps: ["#ffffff", "#f5f5f5", "#f0f0f0", "#e8e8e8", "#e5e5e5", "#cccccc", "#999999", "#666666", "#333333", "#232323", "#1a1a1a", "#000000"]
    count: 12
  semantic:
    - { role: success, value: "#91cb80" }
    - { role: danger, value: "#f94b4b" }
    - { role: info, value: "#5c98f9" }
    - { role: warning, value: "#fbcd44" }
  saturationProfile: muted
  contrast: high

spacing:
  scale: [2, 8, 20, 100]
  baseUnit: 4
  regularity: 0.7

typography:
  families: ["system-ui", "Geist Mono"]
  sizeRamp: [10, 11, 12, 14, 16, 20, 28, 44, 64, 96]
  weightDistribution: { "300": 1, "600": 4, "700": 2, "900": 1 }
  lineHeightPattern: tight

surfaces:
  borderRadii: [10, 14, 16, 20, 24, 999]
  shadowComplexity: layered
  borderUsage: minimal
---

# Character

`ghost-ui` is a quietly editorial design language: pure-monochromatic neutrals do almost all of the work, semantic colors light up only for state, and every interactive surface lands on a generous pill or rounded card. Headings move on a magazine scale via fluid `clamp()` sizing; bodies sit on system-ui at a measured 1.65 line-height. The whole system is restrained — no brand color, no decorative anything — and gets its character from shape rhythm and shadow cadence rather than chroma.

# Signature

- A 12-step pure-monochromatic gray scale (no chromatic tint at any step) is the entire color system; semantic colors are accents, not primaries.
- Pill-first interactive radii: buttons and inputs are 999px; cards stay rounded but not pilled (20px); modals and dropdowns sit between (10–16px).
- Magazine-scale fluid typography — display heading uses `clamp(64px, 8vw, 96px)`, body reading uses `clamp(1rem, 1.3vw, 1.25rem)` — so the type column responds to viewport rather than living on a fixed ramp.
- Three-deep token alias chains (raw step → semantic alias → shadcn alias) so consumers can opt in at any layer of abstraction; the same `--foreground` resolves through `--text-default` to `--color-gray-900`.
- A four-tier shadow system (mini → btn/card → elevated → popover/modal) whose intensity roughly doubles in dark mode rather than inverting — so depth reads consistently across themes.
- Notable absence: no brand color, no gradient, no decorative ornamentation. The design language is anti-flourish.

# Decisions

### color-strategy

The system is monochromatic by default. A 12-step pure-gray scale (white → black) carries surface, border, and text across the entire UI; semantic colors (success, danger, info, warning) appear only when the UI needs to signal state. There is no brand or accent color — distinction is shape and shadow, not chroma.

**Evidence:**
- Monochromatic ladder white → black: `#ffffff`, `#f5f5f5`, `#f0f0f0`, `#e8e8e8`, `#e5e5e5`, `#cccccc`, `#999999`, `#666666`, `#333333`, `#232323`, `#1a1a1a`, `#000000` (declared as `--color-gray-50` through `--color-gray-900` plus `--color-white`/`--color-black`)
- Semantic-only utility colors: `#91cb80` (success), `#f94b4b` (danger), `#5c98f9` (info), `#fbcd44` (warning) — bound to `--background-success`, `--background-danger`, `--background-info`, `--background-warning`
- `src/styles/main.css` declares no brand color or accent — `--color-*: initial` resets Tailwind's defaults

### shape-language

Pill-first interactive radii: every button and input is fully pilled (`999px`) by default; cards stay distinct as soft squares (`20px`); modals (`16px`) and dropdowns (`10px`) live in between. The shape choice is itself a rhythm — interactive vs. structural surfaces are read by their corner radius before any color cue.

**Evidence:**
- `--radius-pill: 999px`, `--radius-button: 999px`, `--radius-input: 999px`
- `--radius-card: 20px`, `--radius-modal: 16px`, `--radius-dropdown: 10px`

### typography-voice

Headings live on a magazine-scale fluid hierarchy: `clamp()` sizing across display (64–96px), section (44–64px), sub (28–40px), and card (20–28px) tiers, with progressively tightening line-heights (0.88 → 1.1) and decreasing negative letter-spacing. Body copy uses `system-ui` at fluid `1rem–1.25rem`; mono is `Geist Mono`. There is no brand display face — the system inherits the OS sans and lets weight + scale do the work.

**Evidence:**
- `--heading-display-font-size: clamp(64px, 8vw, 96px)` with line-height `0.88`, weight `900`
- `--heading-card-font-size: clamp(20px, 2vw, 28px)` with line-height `1.1`, weight `600`
- `--font-sans: system-ui, …`, `--font-mono: "Geist Mono"`

### token-architecture

Tokens layer three deep. The base layer declares raw stepped values (`--color-gray-900: #1a1a1a`). The semantic layer aliases them to roles (`--text-default: var(--color-gray-900)`). The shadcn alias layer wraps the semantic layer (`--foreground: var(--text-default)`, then `--color-foreground: var(--foreground)`). Consumers reach for any layer that matches their intent — Tailwind utilities pull `--color-foreground`; component CSS pulls `--text-default`; raw needs reach `--color-gray-900` directly.

**Evidence:**
- chain `--color-foreground` → `--foreground` → `--text-default` → `--color-gray-900`
- chain `--background-default` → `--color-white`
- the `@theme inline` block in `src/styles/main.css` re-exposes every semantic alias as a Tailwind color token

### theming

Light and dark themes share token names but route through different cascade values: `.dark` overrides the semantic layer (`--background-default`, `--text-default`, etc.) so the alias-chained downstream tokens automatically pick up the new values. Shadows aren't inverted — they're intensified (alpha doubled in dark mode) so depth reads through the darker background. Alpha utility tokens (`--dark-10`, `--dark-40`, `--dark-04`) flip from gray-900-based to white-based across themes.

**Evidence:**
- `.dark { --background-default: var(--color-black); --text-default: var(--color-white); … }`
- light `--shadow-card: 0 2px 8px rgba(76, 76, 76, 0.15)` → dark `--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.4)`

### motion

Three durations (`0.15s` fast, `0.2s` normal, `0.4s` slow) drive every transition; a single shared cubic-bezier easing (`--ease-spring: cubic-bezier(0.33, 1, 0.68, 1)`) gives interactions a consistent decelerating feel. Animations are short, deliberate, and limited to opacity/transform/blur — no heavy motion.

**Evidence:**
- `--duration-fast: 0.15s`, `--duration-normal: 0.2s`, `--duration-slow: 0.4s`
- `--ease-spring: cubic-bezier(0.33, 1, 0.68, 1)`
- keyframe library: `fade-in/out`, `scale-in/out`, `enter-from-left/right`, `word-reveal`

### shadow-hierarchy

Four tiers organize elevation: mini (cards, buttons, kbd), elevated (raised surfaces), popover (floating menus), modal (overlays). Each tier has fixed offset/blur values; the tier is the noun, not the parameters. A separate `mini-inset` exists for inset shadows, and `date-field-focus` is a special-purpose ring. In dark mode every tier's alpha doubles to maintain perceived depth.

**Evidence:**
- `--shadow-mini`, `--shadow-btn`, `--shadow-card`, `--shadow-elevated`, `--shadow-popover`, `--shadow-modal`, `--shadow-kbd`
- `--shadow-mini-inset` for inset accents
- `--shadow-date-field-focus: 0 0 0 3px rgba(26, 26, 26, 0.15)`
