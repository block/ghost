---
id: managerbot
source: llm
timestamp: 2026-04-30T00:00:00Z
sources:
  - squareup/square-web/apps/managerbot
observation:
  personality:
    - utilitarian
    - polished
    - dual-themed
    - ai-native
    - dense
    - chromatic-reserved
  resembles:
    - shadcn-new-york
    - vercel-ai-elements
decisions:
  - dimension: color-strategy
  - dimension: surface-hierarchy
  - dimension: shape-language
  - dimension: typography-voice
  - dimension: elevation
  - dimension: theming-architecture
  - dimension: token-architecture
  - dimension: motion
  - dimension: font-sourcing
rules:
  - id: monochrome-semantic-default
    canonical: color-strategy
    kind: color
    summary: Semantic color tokens must resolve to the neutral ramp by default
    rationale: >-
      The default theme is achromatic — `--primary`, `--secondary`, `--accent`,
      `--muted`, `--card`, `--popover` all chain to `--neutral-*`. Hue is
      reserved for state (destructive, success, warning), trend (trend-up/down),
      and chart data. Wiring a brand hue (`cashapp-*`, `square-*`,
      `--blue-*`) directly into a base surface token is drift.
    pattern: '--(primary|secondary|accent|muted|card|popover|background|foreground|sidebar|panel)\b[^:]*:\s*var\(--(?!neutral|white|black|elevation)'
    enforce_at: [css_var]
    support: 0.97
  - id: tokens-not-literals
    canonical: token-architecture
    kind: color
    summary: Component CSS must reference tokens, not raw oklch/hex/rgba literals
    rationale: >-
      The token layer (`theme.css` + `@theme inline`) carries all 459 named
      tokens — components consume them via `var(--foo)` or Tailwind class
      atoms. An oklch/hex literal anywhere outside `theme.css` bypasses the
      light/dark cascade and the `force-light` utility.
    pattern: '\boklch\(|\b#[0-9a-fA-F]{3,8}\b|\brgba?\('
    enforce_at: [css_var, inline_style]
    support: 0.96
  - id: type-on-ramp
    canonical: typography-voice
    kind: type-size
    summary: Font sizes must come from the `--text-*` ramp
    rationale: >-
      Eight discrete sizes (`xs` 13px → `7xl` 56px) carry matching
      line-heights and letter-spacing. Tailwind v4 emits `text-xs..text-7xl`
      utilities from `@theme inline` — arbitrary `text-[Npx]` values escape
      the rhythm.
    pattern: 'text-\[\d+(\.\d+)?(px|rem|em)\]|font-size:\s*\d'
    enforce_at: [className, inline_style]
    support: 0.94
  - id: radius-on-scale
    canonical: shape-language
    kind: radius
    summary: Corner radii must come from the `--radius-*` scale
    rationale: >-
      Eight tiers: xs 4 / sm 6 / md 8 / lg 12 / xl 16 / 2xl 20 / 3xl 24 /
      4xl 32 px. No pill (999) and no zero-radius — interactives and
      containers share the same vocabulary at different magnitudes. Arbitrary
      `rounded-[Npx]` values fork the shape language.
    pattern: 'rounded-\[\d+px\]|border-radius:\s*\d+px'
    enforce_at: [className, inline_style]
    support: 0.93
  - id: cash-sans-only
    canonical: font-sourcing
    kind: type-family
    summary: Do not bundle fonts beyond Cash Sans
    rationale: >-
      `--font-sans` resolves to `'Cash Sans', ui-sans-serif, system-ui,
      sans-serif, ...emoji-stack`. Cash Sans is loaded from
      `cash-f.squarecdn.com` at three weights (400/500/600). Adding a new
      `@font-face` or a webfont import crosses the font-sourcing decision —
      the Square brand face is the only bundled type.
    pattern: '@font-face|@import\s+url\([^)]*fonts'
    enforce_at: [css_var]
    presence_floor: 0
    support: 1.0
  - id: shadow-on-scale
    canonical: elevation
    kind: shadow
    summary: Shadows must come from the `--shadow-*` scale
    rationale: >-
      Eight tiers (2xs / xs / sm / md / lg / xl / 2xl / inner). Every level
      shares the same 2px ambient + a directional offset that doubles each
      step. Inline `box-shadow` literals or `shadow-[...]` arbitrary values
      break the depth vocabulary.
    pattern: 'shadow-\[[^]]+\]|box-shadow:\s*[^v]'
    enforce_at: [className, inline_style]
    support: 0.95
  - id: no-decorative-motion
    canonical: motion
    kind: motion
    summary: Motion is reserved for state transitions, not decoration
    rationale: >-
      The repo declares exactly one named animation token
      (`--animate-highlights-tab-fade-in: 150ms ease`) plus three keyframes
      tied to a single feature (highlights tabs/progress). No
      hover-bounce, no decorative loops, no `transition: all`. Adding
      decorative motion crosses the restraint baseline.
    pattern: 'transition:\s*all\b|animate-(?!none|highlights-)\w'
    enforce_at: [className, css_var]
    presence_floor: 4
    support: 0.92
palette:
  dominant:
    - { role: primary, value: "oklch(21.56% 0.0000 89.88)", token: "--neutral-900" }
    - { role: primary-foreground, value: "oklch(95.42% 0.0000 89.88)", token: "--neutral-50" }
    - { role: background, value: "oklch(100.00% 0.0000 89.88)", token: "--white" }
    - { role: foreground, value: "oklch(16.98% 0.0000 89.88)", token: "--neutral-950" }
  neutrals:
    steps:
      - "oklch(100.00% 0.0000 89.88)"
      - "oklch(95.42% 0.0000 89.88)"
      - "oklch(56.34% 0.0000 89.88)"
      - "oklch(21.56% 0.0000 89.88)"
      - "oklch(16.98% 0.0000 89.88)"
      - "oklch(0.00% 0.0000 0.00)"
    count: 6
  semantic:
    - { role: destructive, value: "oklch(50.42% 0.1991 28.41)", token: "--red-600" }
    - { role: success, value: "oklch(47.54% 0.0986 161.50)", token: "--green-600" }
    - { role: warning, value: "oklch(82.83% 0.1680 85.60)", token: "--yellow-200" }
    - { role: trend-up, value: "oklch(64.8% 0.2 131.684)", token: "--lime-600" }
    - { role: trend-down, value: "oklch(70.5% 0.213 47.604)", token: "--orange-500" }
    - { role: panel-light, value: "#FCFCFC", token: "--panel" }
    - { role: panel-dark, value: "#181818", token: "--panel" }
  saturationProfile: muted
  contrast: high
spacing:
  scale: [0.5, 4, 16, 20, 24, 32, 280, 768, 1312]
  regularity: 0.4
  baseUnit: 4
typography:
  families:
    - "Cash Sans"
  sizeRamp: [13, 14, 16, 18, 20, 24, 32, 36, 44, 56]
  weightDistribution:
    "400": 1
    "500": 1
    "600": 1
  lineHeightPattern: normal
surfaces:
  borderRadii: [4, 6, 8, 12, 16, 20, 24, 32]
  shadowComplexity: layered
  borderUsage: minimal
metadata:
  bucket_id: managerbot-2026-04-30
  ui_library: "@squareup/managerbot-ui"
  component_count: 103
  token_count: 459
  ai_elements_count: 34
---

# Character

Managerbot's design language is shadcn at heart — new-york style, lucide
icons, neutral baseColor — wearing Square's house font and dressed for
a long sit-down with an LLM. The default theme is monochrome (every
semantic surface chains to a `--neutral-*` step), so when chromatic
color does appear it carries meaning: red for destructive, green for
success, yellow for warning, lime/orange for trend, and a 15-stop chart
ramp for data. The system is dual-themed first, with `:root` and `.dark`
expressing the same vocabulary at inverted lightness, plus a
`force-light` utility for surfaces that must stay bright in dark mode.
What sets it apart from a vanilla shadcn build is the AI-elements
sub-tree — 34 components for conversation, prompt input, reasoning,
artifact, canvas, branch, plan, and tool — wired into the same token
cascade as the primitive shell.

# Decisions

### color-strategy

Treat hue as opt-in semantics, not ambient identity. Every surface
token (`--background`, `--card`, `--popover`, `--primary`, `--secondary`,
`--muted`, `--accent`, `--sidebar`, `--panel`) chains to a step on the
neutral ramp; chromatic ramps exist only to express state, trend, and
chart data. Square's brand colors (`cashapp-*`, `square-*`) are present
in the token layer but unwired — available for marketing surfaces, not
the operating UI.

**Evidence:**
- `--primary: var(--neutral-900)` resolves to `oklch(21.56% 0.0000 89.88)` (light) / `--neutral-200 → oklch(82.94% 0.0000 89.88)` (dark) — theme.css:384,473
- `--secondary: var(--neutral-50)` resolves to `oklch(95.42% 0.0000 89.88)`; `--background: var(--white)` resolves to `oklch(100.00% 0.0000 89.88)`
- `--foreground: var(--neutral-950)` resolves to `oklch(16.98% 0.0000 89.88)`; `--neutral-500: oklch(56.34% 0.0000 89.88)` is the mid-ramp anchor; `--black: oklch(0.00% 0.0000 0.00)` is reserved
- `--destructive: var(--red-600)` resolves to `oklch(50.42% 0.1991 28.41)`; `--success: var(--green-600) → oklch(47.54% 0.0986 161.50)`; `--warning: var(--yellow-200) → oklch(82.83% 0.1680 85.60)`
- `--trend-up: var(--lime-600) → oklch(64.8% 0.2 131.684)`; `--trend-down: var(--orange-500) → oklch(70.5% 0.213 47.604)`
- `cashapp-*` and `square-*` ramps declared (20 stops each) but never referenced from a semantic token
- 396 color tokens / 338 distinct color values in the bucket

### surface-hierarchy

Name surfaces by intent at the semantic layer (`--background`, `--card`,
`--popover`, `--sidebar`, `--panel`) and add an explicit numeric elevation
scale (`--elevation-0/1/2`) for stacking context. The sidebar gets its
own slot family (`--sidebar`, `--sidebar-foreground`, `--sidebar-accent`,
`--sidebar-border`, `--sidebar-ring`, `--sidebar-primary`) so sidebar
restyling never bleeds into the main surface.

**Evidence:**
- `--elevation-0: oklab(97.913% 0 -0.00011)` / `oklch(0% 0 0)` — outer chrome
- `--elevation-1: var(--white)` / `oklch(19.125% ...)` — primary surface
- `--elevation-2: oklch(95.815% ...)` / `oklch(28.094% ...)` — raised surface
- `--sidebar-accent: color-mix(in oklab, var(--foreground) 5%, transparent)` (light) / `10%` (dark) — semantic, not a fixed shade
- `--panel: #FCFCFC` (light) / `#181818` (dark) — the only hex literals at the semantic layer; chrome surface stays distinct from `--background`/`--card`
- 9 spacing-kind tokens including `--width-sidebar: 280px`, `--width-content-narrow: 48rem`, `--width-content-wide: 82rem`

### shape-language

Adopt a moderate-roundness vocabulary — every interactive and structural
surface picks a stop from the same 8-tier `--radius-*` scale (4 / 6 / 8 /
12 / 16 / 20 / 24 / 32 px). No pill, no sharp corner, no per-component
override token. The shape distinction between Button and Card is *which*
radius they pick, not different families.

**Evidence:**
- `--radius-xs: 4px; --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-2xl: 20px; --radius-3xl: 24px; --radius-4xl: 32px` (theme.css:988-995)
- 8 radius tokens, 8 distinct radius values in the bucket — no aliases, no per-component radius
- `--border-width-hairline: 0.5px` and `@utility border-hairline` for sub-pixel dividers

### typography-voice

Use a 10-stop type ramp (`xs` 13 → `7xl` 56 px) with line-height and
letter-spacing baked into the token. Bodies sit at zero tracking; only
display sizes (`2xl` and up) carry negative letter-spacing, escalating
from `-0.2px` at `2xl` to `-2.2px` at `6xl`/`7xl`. Cash Sans is the only
bundled face, with three weight loads (Regular 400, Medium 500, Medium
again at 600) — there is no separate semibold cut, by design.

**Evidence:**
- `--text-xs: 0.8125rem` (13px) → `--text-7xl: 3.5rem` (56px); 10 sizes total (theme.css:1011-1053)
- `--text-2xl--letter-spacing: -0.2px`, `3xl: -0.4px`, `4xl: -0.5px`, `5xl: -1.4px`, `6xl/7xl: -2.2px`
- `--text-xs/sm/base/lg/xl--letter-spacing: 0` — body sizes intentionally zero
- `--font-sans: 'Cash Sans', ui-sans-serif, system-ui, sans-serif, ...` (theme.css:547)
- `@font-face` declarations load CashSans-Regular (400), CashSans-Medium (500), CashSans-Medium again (600) from `cash-f.squarecdn.com` (globals.css:5-33)

### elevation

Build depth as a continuous numeric ramp, not as named roles. Eight
shadow tokens (2xs / xs / sm / md / lg / xl / 2xl / inner) compose a
fixed 2px ambient layer with a directional offset that scales 0→4→8→16→24
→48 px. Dark mode does not redefine shadows — the ambient layer is faint
enough on dark surfaces and the directional layer carries the read.

**Evidence:**
- `--shadow-2xs: 0 1px 0 0 rgba(0,0,0,0.05)` — flat highlight
- `--shadow-xs: 0 0 1px 0 rgba(0,0,0,0.05)`
- `--shadow-sm/md/lg/xl: 0 0 2px 0 rgba(0,0,0,0.1), 0 [4|8|16|24]px [8|16|32|48]px [-2|-4|-8|-12]px rgba(0,0,0,0.06–0.1)` — composed pairs (theme.css:1004-1007)
- `--shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.25)` — outlier, only one declared
- `--shadow-inner: inset 0 0 1px 0 rgba(0,0,0,0.40)`
- `.dark` block omits all `--shadow-*` declarations — single source for both themes

### theming-architecture

Cascade two layers: a raw color-ramp + scalar layer in `:root`, then a
semantic alias layer also in `:root` and re-declared under `.dark` (and
the `force-light` `@utility`). Tailwind's `@theme inline` block at the
end re-exports both layers as `--color-*` / `--text-*` / `--radius-*` /
`--shadow-*` so utility classes can resolve. Components read the
semantic tokens or the Tailwind utilities — never raw oklch.

**Evidence:**
- `:root` carries 396 color tokens (raw ramps) + ~30 semantic aliases (`--background`, `--primary`, ...)
- `.dark` re-declares only the ~30 semantic aliases — raw ramps inherit
- `@utility force-light` re-declares the same semantic set against light values, used to pin chrome to a light register inside dark surfaces
- `@theme inline { --color-*: var(--*); }` re-exports every token for Tailwind v4 class-atom generation (theme.css:544-984)
- `@source "../**/*.{ts,tsx}"; @source "../**/*.stories.{ts,tsx}";` (globals.css:35-36) bounds Tailwind's content scan

### token-architecture

Hold every literal in the token layer; let alias chains carry semantics.
Of 459 declared tokens, ~30 semantic surface tokens (`--primary`,
`--card`, `--accent`, ...) chain via `var(--neutral-*)` to a raw step;
chart tokens (`--chart-1`..`--chart-15`) chain to chosen ramp stops
across sky/teal/cyan/emerald/lime/green; raw ramp tokens are leaves
(`oklch(...)`). The `@theme inline` re-exports add a second alias layer
for Tailwind class atoms but do not change semantics — they exist purely
so `bg-primary` resolves.

**Evidence:**
- 459 canonical tokens (excluding `@theme inline` mechanical re-exports)
- 396 color tokens; 12 spacing/layout; 34 typography (10 size triples + font-sans + 3 line-height defaults); 8 radius; 8 shadow; 1 motion
- Alias chains observed in semantic surface tokens, semantic state tokens, chart slots, and sidebar slots
- Raw color ramps (e.g. `--neutral-50: oklch(95.42% 0.0000 89.88)`) are leaves — no chains
- The Tailwind palette extension (`--slate-*`, `--gray-*`, `--zinc-*`, `--stone-*`, `--rose-*`, `--orange-*`, `--amber-*`, `--lime-*`, `--emerald-*`, `--teal-*`, `--cyan-*`, `--sky-*`, `--indigo-*`, `--violet-*`, `--fuchsia-*`, `--pink-*`) is included for chart use only — present but not wired into semantic tokens

### motion

Motion is reserved for functional state transitions; no decorative
animation. The system declares exactly one motion token
(`--animate-highlights-tab-fade-in: 150ms ease forwards`) and three
keyframes (`highlights-progress-fill`, `highlights-progress-drain`,
`highlights-tab-fade-in`) that serve a single feature surface (tabbed
highlights with progress). Component code uses Radix's data-state
attributes and `motion`/`framer-motion` for entry/exit; no
`transition: all`, no hover-only animations.

**Evidence:**
- `--animate-highlights-tab-fade-in: highlights-tab-fade-in 150ms ease forwards` (theme.css:1055)
- `@keyframes highlights-progress-fill / -drain / -tab-fade-in` (globals.css:44-72)
- `tw-animate-css` imported in globals.css:3 — provides `animate-in/out` utilities for Radix data-state
- `motion` (catalog dep) and `framer-motion` (catalog dep) used in `managerbot-web` for entry transitions
- 1 motion-kind token in the bucket — comparable repos with decorative motion register 5–15

### font-sourcing

The Square brand face is the only bundled type. Cash Sans is loaded
from `cash-f.squarecdn.com` at Regular (400), Medium (500), and Medium
again at 600 (intentional — Square's typeface ships no Semibold cut).
The fallback chain is `ui-sans-serif, system-ui, sans-serif, "Apple
Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
so brand absence falls back to system-native rather than a generic
serif. There is no `--font-mono` or `--font-serif` token in the system.

**Evidence:**
- `@font-face` x3 for Cash Sans (Regular/Medium/Medium-as-600), `font-display: swap` (globals.css:5-33)
- Source: `https://cash-f.squarecdn.com/static/fonts/cashsans/woff2/CashSans-{Regular,Medium}.woff2`
- `--font-sans: 'Cash Sans', ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"` (theme.css:547)
- No `--font-mono` or `--font-serif` declared in the bucket — code blocks rely on UA defaults via Tailwind's `font-mono` class
