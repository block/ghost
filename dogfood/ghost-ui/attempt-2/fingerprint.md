---
id: ghost-ui
source: llm
timestamp: 2026-04-29T16:15:00Z
sources:
  - github:block/ghost#packages/ghost-ui

observation:
  personality: [monochromatic, editorial, restrained, generous, rhythmic]
  resembles: [vercel-geist, linear]

decisions:
  - dimension: color-strategy
  - dimension: chart-strategy
  - dimension: surface-hierarchy
  - dimension: shape-language
  - dimension: theming-architecture
  - dimension: typography-voice
  - dimension: font-sourcing
  - dimension: density
  - dimension: interactive-patterns
  - dimension: elevation
  - dimension: motion

palette:
  dominant:
    - { role: ink, value: "#1a1a1a" }
  neutrals:
    steps: ["#ffffff", "#f5f5f5", "#f0f0f0", "#e8e8e8", "#e5e5e5", "#cccccc", "#999999", "#666666", "#333333", "#232323", "#1a1a1a", "#000000"]
    count: 12
  semantic:
    - { role: success, value: "#91cb80" }
    - { role: success-light, value: "#a3d795" }
    - { role: danger, value: "#f94b4b" }
    - { role: danger-light, value: "#ff6b6b" }
    - { role: info, value: "#5c98f9" }
    - { role: info-light, value: "#7cacff" }
    - { role: warning, value: "#fbcd44" }
    - { role: warning-light, value: "#ffd966" }
    - { role: chart-1, value: "#f6b44a" }
    - { role: chart-2, value: "#7585ff" }
    - { role: chart-3, value: "#d76a6a" }
    - { role: chart-4, value: "#d185e0" }
    - { role: chart-5, value: "#91cb80" }
  saturationProfile: muted
  contrast: high

spacing:
  scale: [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 30, 40, 44, 60, 64, 75, 96, 100, 200]
  baseUnit: 4
  regularity: 0.6

typography:
  families: ["system-ui", "Geist Mono", "serif"]
  sizeRamp: [10, 11, 12, 14, 16, 20, 28, 44, 64, 96]
  weightDistribution: { "300": 1, "600": 4, "700": 2, "900": 1 }
  lineHeightPattern: tight

surfaces:
  borderRadii: [10, 14, 16, 20, 24, 999]
  shadowComplexity: layered
  borderUsage: minimal
---

# Character

`ghost-ui` is an editorial design language: a 12-step pure-monochromatic neutral scale carries surface, border, and text across the whole UI; chroma appears only when the UI signals state or surfaces data. Headings move on a magazine-scale fluid hierarchy and inputs/buttons land on full pills, so the visual rhythm comes from shape and shadow rather than color. The system ships no bundled fonts and no brand color — character is in the discipline, not the ornament.

# Decisions

### color-strategy

Treat hue as opt-in communication, not ambient decoration. A 12-step pure-monochromatic neutral ladder (`#ffffff` through `#000000`) carries surface, border, and text across the entire UI; eight semantic colors light up only when the UI signals state (success, danger, info, warning, each in a default + light variant for theme cascade). There is no brand color, no accent hue. Distinction comes from shape and shadow, not chroma.

**Evidence:**
- Monochromatic ladder: `#ffffff`, `#f5f5f5`, `#f0f0f0`, `#e8e8e8`, `#e5e5e5`, `#cccccc`, `#999999`, `#666666`, `#333333`, `#232323`, `#1a1a1a`, `#000000` (declared as `--color-gray-50` through `--color-gray-900` plus `--color-white`/`--color-black`)
- Semantic state colors with light/dark cascade: `#91cb80` / `#a3d795` (success), `#f94b4b` / `#ff6b6b` (danger), `#5c98f9` / `#7cacff` (info), `#fbcd44` / `#ffd966` (warning)
- The `@theme` block in `src/styles/main.css` opens with `--color-*: initial` — explicitly resetting Tailwind's default palette so nothing chromatic leaks in.
- `--background-accent: var(--color-gray-900)` — the "accent" maps to the extreme of the gray scale, not a brand hue. The accent slot itself is monochrome.

### chart-strategy

Data visualization gets a deliberately separate, warm-leaning 5-color palette (`#f6b44a` orange, `#7585ff` periwinkle, `#d76a6a` coral, `#d185e0` lilac, `#91cb80` green) that intentionally departs from the monochromatic discipline applied everywhere else. Charts need categorical distinction; the rest of the UI doesn't. Naming the chart palette as a separate sub-strategy keeps the discipline gate clear: chroma here is signal, not seepage.

**Evidence:**
- `--chart-1: #f6b44a`, `--chart-2: #7585ff`, `--chart-3: #d76a6a`, `--chart-4: #d185e0`, `--chart-5: #91cb80`
- Same five chart values declared identically in `:root` and `.dark` — the chart palette is the one thing that doesn't theme-cascade. Cross-theme consistency is the goal for data.

### surface-hierarchy

Name surfaces by intent rather than by shade number. Backgrounds, borders, and text each get their own semantic vocabulary (`default`, `alt`, `medium`, `muted`, `inverse`, `accent`, plus `danger`/`success`/`info`/`warning` for state and `strong`/`card`/`input`/`input-hover` for borders). A theme preset can remap every value without touching component logic — the slot names are the contract.

**Evidence:**
- 9 background slots: `--background-default`, `--background-alt`, `--background-medium`, `--background-muted`, `--background-inverse`, `--background-accent`, `--background-danger`, `--background-success`, `--background-info`, `--background-warning`
- 10 border slots: `--border-default`, `--border-input`, `--border-input-hover`, `--border-strong`, `--border-card`, `--border-inverse`, `--border-accent`, plus state borders
- 8 text slots mirroring the same vocabulary
- A separate `--sidebar-*` namespace (8 slots) lets sidebar UI carry its own surface vocabulary parallel to the main one — intentional surface-zone separation.

### shape-language

Apply a pill-first radius philosophy that sorts surfaces by interaction. Buttons, inputs, and toggles are fully pilled (`999px`) — interactive surfaces are circular at the ends. Cards stay rounded but distinct as soft squares (`14`/`20`/`24px`). Modals (`16px`) and dropdowns (`10px`) live in between. The shape choice itself is a rhythm: interactive vs. structural surfaces are read by their corner radius before any color cue.

**Evidence:**
- `--radius-pill: 999px`, `--radius-button: 999px`, `--radius-input: 999px`
- `--radius-card: 20px`, `--radius-card-lg: 24px`, `--radius-card-sm: 14px`
- `--radius-modal: 16px`, `--radius-dropdown: 10px`
- `--radius: 20px` (the system base) with derived `--radius-sm/md/lg/xl` via `calc()`

### theming-architecture

Cascade three layers — raw stepped values → semantic aliases → shadcn aliases — so the entire visual language swaps at runtime through CSS custom property injection without touching component code. Consumers reach for whichever layer matches their intent: Tailwind utilities pull `--color-foreground`; component CSS pulls `--text-default`; raw needs reach `--color-gray-900`. Five bundled theme presets (default plus four overrides under `src/lib/theme-presets.ts`) validate that shape, color, and contrast can all be remapped.

**Evidence:**
- chain `--color-foreground` → `--foreground` → `--text-default` → `--color-gray-900`
- chain `--background-default` → `--color-white` (light) / `--color-black` (dark)
- The `@theme inline` block in `main.css` re-exposes every semantic alias as a Tailwind color token (`--color-background-default: var(--background-default)`, etc.)
- `src/lib/theme-presets.ts` ships 5 named presets that each remap base + semantic layers without changing the alias contract.

### typography-voice

Use a magazine-scale type hierarchy where display headings and body sizes scale with viewport via `clamp()` rather than living on a fixed ramp. Four heading tiers (`display`, `section`, `sub`, `card`) each carry their own progressively-tightening line-height (0.88 → 1.1) and decreasing negative letter-spacing. Editorial helpers — `--label-*` (uppercase kicker), `--pullquote-*` (light contrast voice) — supply visual punctuation for longform content.

**Evidence:**
- `--heading-display-font-size: clamp(64px, 8vw, 96px)`, line-height `0.88`, letter-spacing `-0.05em`, weight `900`
- `--heading-section-font-size: clamp(44px, 5vw, 64px)`, line-height `0.95`, weight `700`
- `--heading-sub-font-size: clamp(28px, 3vw, 40px)`, line-height `1`, weight `700`
- `--heading-card-font-size: clamp(20px, 2vw, 28px)`, line-height `1.1`, weight `600`
- `--display-size: clamp(3rem, 12vw, 12rem)` — hero-scale fluid display
- `--body-reading-size: clamp(1rem, 1.3vw, 1.25rem)`, line-height `1.65` — longform reading rhythm
- `--label-font-size: 11px`, letter-spacing `0.12em`, weight `600` — uppercase kicker type
- `--pullquote-weight: 300`, line-height `1.3` — light contrast voice for editorial punctuation

### font-sourcing

Ship no bundled typefaces. The system declares a `system-ui` sans stack, `Geist Mono` with a monospace fallback, and a generic `serif` — typography responsibility moves to the consumer. The visual language adapts to the host platform's default face, which keeps the library dependency-free and lets hosts impose their own brand font without overriding.

**Evidence:**
- `src/styles/font-faces.css` is one comment: `/* Design language ships with no bundled fonts — consumers bring their own. */` — zero `@font-face` declarations.
- `--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- `--font-mono: "Geist Mono", monospace`
- `--font-serif: serif`
- `--font-display: system-ui, …` (intentionally same as sans — no separate display face)

### density

Maintain compact interactive controls inside generous structural whitespace. Buttons and inputs sit in the 32–40px height range (`h-8`/`h-9`/`h-10` Tailwind utilities backed by `--spacing-button: 2.75rem` and `--spacing-input: 3.25rem` tokens), while page sections use lavish padding (`--section-padding-vertical: 100px`, `--section-heading-margin-bottom: 75px`). The result is a publishing-oriented reading rhythm in the structural layer, not a dense tool-UI feel.

**Evidence:**
- Component-height tokens declared explicitly: `--spacing-button: 2.75rem` (44px), `--spacing-button-sm: 2rem` (32px), `--spacing-input: 3.25rem` (52px), `--spacing-input-sm: 2.75rem` (44px)
- Page-rhythm tokens: `--page-container-max-width: 1440px`, `--page-container-side-gutter: 20px`, `--section-padding-vertical: 100px`, `--section-heading-margin-bottom: 75px`
- Button cva (in `src/components/ui/button.tsx`) declares fixed sizes `default: h-9`, `sm: h-8`, `lg: h-10`, plus three icon sizes — interactive surfaces have committed heights, not derived ones.

### interactive-patterns

Standardize focus states as a 2-ring with offset using the `--ring` token, applied uniformly across every component, plus a global `*:focus-visible` fallback for browser-default elements. Browser default outlines are replaced with a consistent, theme-aware focus indicator that works in both light and dark modes.

**Evidence:**
- Global rule in `main.css`: `*:not(body):not(.focus-override) { outline: none !important; &:focus-visible { @apply focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-hidden; } }`
- `--ring: var(--border-strong)` in light, same alias resolves to white in dark — focus ring intensity follows theme contrast.
- Button cva declares `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px]` — component-level reinforcement.
- Link helper class: `.link { @apply ... focus-visible:ring-ring focus-visible:ring-offset-background ... }` — same pattern applied to inline links.

### elevation

Name shadows by structural role rather than by intensity level, and intensify shadow alpha in dark mode rather than removing them. Seven named tiers (`mini`, `btn`, `card`, `elevated`, `popover`, `modal`, `kbd`) plus two special-purpose (`mini-inset`, `date-field-focus`) give designers a vocabulary tied to component context instead of a numeric scale. Depth cues stay legible on dark surfaces because alpha doubles, not because the shadow flips.

**Evidence:**
- 7 named tiers: `--shadow-mini`, `--shadow-btn`, `--shadow-card`, `--shadow-elevated`, `--shadow-popover`, `--shadow-modal`, `--shadow-kbd`
- 2 special-purpose: `--shadow-mini-inset`, `--shadow-date-field-focus`
- Light: `--shadow-card: 0 2px 8px rgba(76, 76, 76, 0.15)` → Dark: `--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.4)` — alpha intensifies (~3×), shadow stays.
- Light: `--shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.2)` → Dark: `--shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.6)` — same intensification pattern at the heaviest tier.

### motion

Keep transitions functional and brief — three duration tiers (`0.15s` fast, `0.2s` normal, `0.4s` slow) drive every interaction, and a single shared cubic-bezier easing (`cubic-bezier(0.33, 1, 0.68, 1)`) gives the system a consistent decelerating feel. Animations are limited to opacity, transform, and blur; there is no decorative motion, no kinetic ornament.

**Evidence:**
- `--duration-fast: 0.15s`, `--duration-normal: 0.2s`, `--duration-slow: 0.4s`
- `--ease-spring: cubic-bezier(0.33, 1, 0.68, 1)`
- 12 named animation tokens (`--animate-*`): `accordion-down/up`, `caret-blink`, `enter-from-left/right`, `exit-to-left/right`, `fade-in/out`, `scale-in/out`, `word-reveal`
- `tw-animate-css` is the only motion library imported via `main.css` — `motion` is in `dependencies` but not pulled into the styles entry point.
