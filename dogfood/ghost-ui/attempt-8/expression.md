---
id: ghost-ui
source: llm
timestamp: 2026-05-05T11:17:24Z
sources:
  - block/ghost@packages/ghost-ui@a7e4af7+dirty
observation:
  personality:
    - editorial
    - monochrome-default
    - token-driven
    - pill-forward
    - compact
    - themeable
  resembles:
    - shadcn/ui
    - Vercel Geist
    - Linear
references:
  specs:
    - src/styles/main.css
    - src/styles/font-faces.css
    - src/lib/theme-defaults.ts
    - src/lib/theme-presets.ts
    - registry.json
  components:
    - src/components/ui
    - src/components/ai-elements
    - src/components/theme
  examples:
    - README.md
    - .shadcn/skills.md
decisions:
  - dimension: color-strategy
  - dimension: surface-hierarchy
  - dimension: theming-architecture
  - dimension: shape-language
  - dimension: typography-voice
  - dimension: font-sourcing
  - dimension: spatial-system
  - dimension: density
  - dimension: elevation
  - dimension: motion
  - dimension: token-architecture
checks: []
palette:
  dominant:
    - role: background
      value: "#ffffff"
    - role: foreground-accent
      value: "#1a1a1a"
    - role: border
      value: "#e8e8e8"
    - role: muted-surface
      value: "#f0f0f0"
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
      - "#0a0a0a"
      - "#000000"
    count: 13
  semantic:
    - role: danger
      value: "#f94b4b"
    - role: danger-dark
      value: "#ff6b6b"
    - role: success
      value: "#91cb80"
    - role: success-dark
      value: "#a3d795"
    - role: info
      value: "#5c98f9"
    - role: info-dark
      value: "#7cacff"
    - role: warning
      value: "#fbcd44"
    - role: warning-dark
      value: "#ffd966"
    - role: chart-1
      value: "#f6b44a"
    - role: chart-2
      value: "#7585ff"
    - role: chart-3
      value: "#d76a6a"
    - role: chart-4
      value: "#d185e0"
    - role: chart-5
      value: "#91cb80"
    - role: dark-surface
      value: "#0a0a0a"
  saturationProfile: mixed
  contrast: high
spacing:
  scale: [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 64, 75, 96, 100, 256, 288, 320]
  regularity: 0.78
  baseUnit: 4
typography:
  families:
    - 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    - '"Geist Mono", monospace'
    - serif
  sizeRamp: [11, 12, 14, 16, 18]
  weightDistribution:
    "300": 1
    "400": 5
    "500": 38
    "600": 9
    "700": 2
    "900": 1
  lineHeightPattern: tight
surfaces:
  borderRadii: [0, 10, 14, 16, 18, 20, 24, 999]
  shadowComplexity: layered
  borderUsage: moderate
  borderTokenCount: 19
---

# Character

A compact shadcn-derived component system wears an editorial, monochrome-first skin. Its default theme is nearly achromatic and high-contrast, but the package also ships five runtime presets that can replace the color and radius vocabulary without changing component code. The component layer is dense and practical: small type, tight controls, pill-forward interactive elements, tokenized surfaces, and structural motion for overlays, navigation, loading, and AI-status affordances.

# Signature

The recognizable output posture is a designed catalogue surface rather than a generic app chrome: strong editorial scale exists in the token layer, while actual components stay tight, functional, and repeatable. Screens should compose compact pill controls, role-named surfaces, and restrained grayscale hierarchy, then use hue only when it carries state, data, or an intentional theme preset. Variety should come through type scale, shaped task layouts, semantic color, and token-preserving theme swaps, not through one-off decoration or arbitrary component styling.

# Decisions

### color-strategy

Default UI color is mostly grayscale; hue is reserved for semantic state, charts, and optional runtime presets. The broad survey has 141 color rows because bundled presets ship alternate palettes, but the default component contract still resolves most high-occurrence UI color through semantic tokens instead of ad hoc literals.

**Evidence:**
- Survey top color rows: `#ffffff` (385 occurrences), `#1a1a1a` (305), `#e8e8e8` (241), `#f0f0f0` (223), `#999999` (193).
- Default neutral ladder appears as `#ffffff`, `#f5f5f5`, `#f0f0f0`, `#e8e8e8`, `#e5e5e5`, `#cccccc`, `#999999`, `#666666`, `#333333`, `#232323`, `#1a1a1a`, `#0a0a0a`, `#000000`.
- Semantic/default hues are tokenized: danger `#f94b4b` / `#ff6b6b`, success `#91cb80` / `#a3d795`, info `#5c98f9` / `#7cacff`, warning `#fbcd44` / `#ffd966`.
- Chart hues are a separate data palette: `#f6b44a`, `#7585ff`, `#d76a6a`, `#d185e0`, `#91cb80`.

### surface-hierarchy

Surfaces are named by role, not shade number. Background, foreground, border, input, card, popover, sidebar, accent, and destructive tokens form the component vocabulary, with default and dark values flowing through the same names.

**Evidence:**
- High-usage aliases: `--background` -> `#ffffff` (145 occurrences), `--border` -> `#e8e8e8` (147), `--border-input` -> `#e5e5e5` (32), `--text-default` -> `#1a1a1a` (29).
- Components use role atoms such as `bg-background`, `bg-muted`, `text-muted-foreground`, `border-input`, `ring-ring/50`, and `bg-card`.
- Dark surface tokens include `#000000`, `#232323`, `#333333`, and `#0a0a0a` rather than a separate component branch.

### theming-architecture

The theme architecture is a CSS-variable cascade: raw constants and semantic variables feed shadcn aliases, then Tailwind `@theme inline` exposes them to class atoms. Runtime presets override the same semantic keys, including radius tokens, so theme switching changes the language through variables rather than component variants.

**Evidence:**
- `src/styles/main.css` declares 240 unique CSS variable names.
- `src/lib/theme-presets.ts` ships five non-default presets: `warm-sand`, `ocean`, `midnight-luxe`, `neon-brutalist`, and `soft-pastel`.
- `neon-brutalist` sets `--radius`, `--radius-pill`, `--radius-button`, `--radius-input`, `--radius-card`, `--radius-card-lg`, `--radius-card-sm`, `--radius-dropdown`, and `--radius-modal` to `0px`.

### shape-language

The default shape system is pill-forward for interactives and moderately rounded for containers, with a notable preset escape hatch to square everything off. Shape is therefore a default design stance plus a themeable axis, not a hard global constant.

**Evidence:**
- Radius rows: `20px` (114 occurrences), `18px` (49), `999px` (46), `16px` (27), preset-driven `0px` (23), `10px` (16), `14px` (11), and `24px` (10).
- Button uses `rounded-full`; card and message surfaces use `rounded-lg`; dropdowns use `rounded-dropdown`; many controls inherit `rounded-md`.
- Theme defaults define `--radius-button: 999px`, `--radius-input: 999px`, `--radius-card: 20px`, `--radius-dropdown: 10px`, and `--radius-modal: 16px`.

### typography-voice

Typography mixes compact utility text with an editorial display system. Most component usage is `text-sm`/`text-xs` and medium weight, while the token layer still carries dramatic display clamps, tight line heights, negative tracking, and uppercase-label rhythm.

**Evidence:**
- Component class atoms: `text-sm` resolves to `14px` (121 occurrences) and `text-xs` resolves to `12px` (74).
- Editorial tokens include `clamp(64px, 8vw, 96px)`, `clamp(44px, 5vw, 64px)`, `clamp(3rem, 12vw, 12rem)`, line heights `0.85`, `0.88`, `0.95`, and letter spacing `-0.05em`, `-0.035em`, `-0.02em`, `-0.01em`.
- Weight usage is concentrated at `500` (38 occurrences) with smaller signals for `600`, `700`, `900`, `400`, and `300`.

### font-sourcing

The CSS contract remains consumer-supplied for fonts even though the source tree currently contains unused font assets. `font-faces.css` declares no `@font-face`; the shipped token layer names system sans, Geist Mono, and generic serif stacks.

**Evidence:**
- `src/styles/font-faces.css` contains only the comment that the design language ships with no bundled fonts.
- Token rows include `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`, `"Geist Mono", monospace`, and `serif`.
- The package `files` list publishes `src/styles` and `registry.json`, not `src/fonts`.

### spatial-system

Spacing is visibly Tailwind-consumed rather than only token-declared. The dominant rhythm is a 4px utility grid with half-step exceptions, plus named component heights and a few large layout widths.

**Evidence:**
- Class-derived spacing rows dominate: `16px` (224 occurrences), `8px` (206), `12px` (107), `4px` (102), `32px` (56), `6px` (48).
- Named component heights remain present: `--spacing-button-sm` -> `32px`, `--spacing-button` -> `44px`, `--spacing-input` -> `52px`.
- Layout-specific rows include `75px`, `96px`, `100px`, `256px`, `288px`, and `320px`, which should not be mistaken for the core control rhythm.

### density

The component layer is compact and repeated-action friendly, while page-level tokens preserve larger editorial whitespace. Controls cluster around 32-40px heights with 12-14px text; cards and page sections carry the bigger breathing room.

**Evidence:**
- Button sizes use `h-8`, `h-9`, `h-10`, `w-7`, `w-8`, `w-9`, and `w-10`; `Button` defaults to `text-sm`.
- `MessageContent` uses `text-sm`, `gap-2`, `px-4`, and `py-3`.
- Page-level tokens still include `--section-padding-vertical: 100px` and `--section-heading-margin-bottom: 75px`.

### elevation

Elevation is layered and role-named. Shadows are not a numeric scale; they map to mini, button, card, elevated, popover, modal, keyboard, and date-field focus roles, with dark-mode variants increasing opacity.

**Evidence:**
- Shadow rows include `0 2px 8px rgba(76, 76, 76, 0.15)` (58 occurrences), `0 8px 30px rgba(0, 0, 0, 0.12)` (21), `0 20px 60px rgba(0, 0, 0, 0.2)` (14), and `0 0 0 3px rgba(26, 26, 26, 0.15)` (12).
- Dark defaults define the same role names with stronger opacity, including modal at `rgba(0, 0, 0, 0.6)`.
- `shadow-none` is also used (9 occurrences), mainly as a local suppression rather than the global posture.

### motion

Motion is practical, not absent. The scan found structural enter/exit atoms, duration tiers, accordion/caret/fade/scale tokens, and status/loading animations such as pulse, ping, and spin. The old "no decorative motion" stance is too strong for the current codebase.

**Evidence:**
- `animate-in` appears 30 times and `animate-out` 28 times across overlay/sheet-style behavior.
- Duration values include `150ms`, `200ms`, `300ms`, `400ms`, `500ms`, and `1000ms`; the token layer declares fast/normal/slow as `150ms`, `200ms`, and `400ms`.
- Loading/status motion appears as `animate-pulse`, `animate-ping`, and `animate-spin` in skeleton, test-results, speech-input, terminal, and spinner components.

### token-architecture

The intended token architecture is semantic, but the faithful Tailwind atom pass exposed a real conflict: `main.css` resets `--color-*`, while several AI elements still use default Tailwind color families. Those atoms are unresolved locally and should be treated as lower-confidence scan evidence and likely drift from the semantic token contract.

**Evidence:**
- Survey has 269 token rows: 240 declared CSS variable tokens plus 29 unresolved local Tailwind color token usages.
- Unresolved local tokens account for 103 occurrences, including `--color-red-400`, `--color-red-700`, `--color-green-400`, `--color-blue-600`, `--color-yellow-400`, `--color-orange-700`, and `--color-zinc-800`.
- Resolved color class usage still dominates: 698 resolved color class occurrences versus 103 unresolved local color-token occurrences.
