---
id: managerbot
source: llm
timestamp: 2026-05-04T00:00:00-04:00
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
references:
  specs:
    - libs/managerbot/managerbot-ui/src/styles/theme.css
    - libs/managerbot/managerbot-ui/src/styles/globals.css
    - libs/managerbot/managerbot-ui/components.json
  components:
    - libs/managerbot/managerbot-ui/src/components
    - libs/managerbot/managerbot-ui/src/components/ai-elements
    - apps/managerbot/managerbot-web/src/components
  examples:
    - apps/managerbot/managerbot-web/src/routes
    - apps/managerbot/managerbot-storybook
decisions:
  - dimension: color-strategy
  - dimension: surface-hierarchy
  - dimension: shape-language
  - dimension: typography-voice
  - dimension: elevation
  - dimension: theming-architecture
  - dimension: token-architecture
  - dimension: composition-patterns
  - dimension: motion
  - dimension: font-sourcing
checks:
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
    observed_count: 33
    support: 0.97
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
    observed_count: 3
    support: 1.0
  - id: no-decorative-motion
    canonical: motion
    kind: motion
    summary: Motion is reserved for state transitions, not decoration
    rationale: >-
      The repo declares exactly one named animation token
      (`--animate-highlights-tab-fade-in: 150ms ease`) plus three keyframes
      tied to a single feature (highlights tabs/progress). Loading spinners
      use `animate-spin`, but no hover-bounce, decorative loop, or broad
      `transition: all` pattern is part of the language.
    pattern: 'transition:\s*all\b|animate-(?!none|spin|highlights-)\w'
    enforce_at: [className, css_var]
    observed_count: 24
    support: 0.96
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
  scale: [0.5, 4, 16, 24, 32, 280, 768, 1312]
  regularity: 0.35
  baseUnit: 4
typography:
  families:
    - "Cash Sans"
  sizeRamp: [9, 10, 11, 12.8, 13, 14, 16, 18, 20, 24, 32, 36, 44, 56]
  weightDistribution:
    "400": 1
    "500": 1
    "600": 1
  lineHeightPattern: normal
surfaces:
  borderRadii: [4, 6, 8, 12, 16, 20, 24, 28, 32, 35]
  shadowComplexity: layered
  borderUsage: minimal
metadata:
  survey_id: managerbot-2026-05-04
  source_commit: "002dd6938bf"
  ui_library: "@squareup/managerbot-ui"
  component_count: 108
  token_count: 459
  value_count: 432
  ai_elements_count: 34
---

# Character

Managerbot's design language is shadcn at heart — new-york style, Lucide
icons, neutral baseColor — wearing Square's house font and dressed for a
long sit-down with an LLM. The default theme is monochrome (semantic
surfaces chain to `--neutral-*` steps), so chromatic color is strongest
when it carries state, trend, or chart meaning: red for destructive,
green for success, yellow for warning, lime/orange for trend, and a
15-stop chart ramp for data. The system is dual-themed first, with a
scoped `.managerbot-ui-root` token layer, `.dark` overrides, and a
`force-light` utility for surfaces that must stay bright in dark mode.
What sets it apart from a vanilla shadcn build is the AI-elements
sub-tree — 34 components for conversation, prompt input, reasoning,
artifact, canvas, branch, plan, and tool — wired into the same token
cascade as the primitive shell, while app routes occasionally bend the
scale for high-touch chat and automation moments.

# Signature

Managerbot should read as a polished operational console for AI-assisted
seller work: dense routes and chat surfaces, restrained monochrome
structure, Square-brand typography, and color only when it communicates
state, trend, or chart meaning. The recognizable output posture is
shadcn-new-york discipline plus AI-native affordances: conversation
workspaces, tracker lists, metric dashboards, and compact control
surfaces rather than marketing gloss.

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
- 396 color tokens / 372 distinct color rows in the survey; 34 inline or arbitrary color literals are product-surface exceptions, mostly stories, chart fixtures, and employee-color helpers

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
- 12 spacing/layout tokens including `--width-sidebar: 280px`, `--width-content-narrow: 48rem`, `--width-content-wide: 82rem`, icon sizes, page padding, and hairline border width

### shape-language

Adopt a moderate-roundness vocabulary at the shared UI layer: interactive
and structural surfaces pick from the same 8-tier `--radius-*` scale (4 /
6 / 8 / 12 / 16 / 20 / 24 / 32 px). Product routes sometimes express that
same vocabulary with bracket utilities (`rounded-[6px]`, `rounded-[12px]`)
and occasionally bend it for chat or automation chrome (`2rem`,
`1.75rem`, `inherit`), so the language is rounded and friendly rather
than strictly token-only. The shape distinction between Button, Card,
avatar, and popover is usually which radius stop they pick, not a
separate family.

**Evidence:**
- `--radius-xs: 4px; --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-2xl: 20px; --radius-3xl: 24px; --radius-4xl: 32px` (theme.css:988-995)
- 8 radius tokens, 13 distinct radius values, and 54 arbitrary-class radius observations in the refreshed survey
- Most arbitrary radii still land on the token values (`6px`, `8px`, `12px`, `16px`, `24px`); off-scale values are concentrated in avatar inheritance, chat input, and automation popover surfaces
- `--border-width-hairline: 0.5px` and `@utility border-hairline` for sub-pixel dividers

### typography-voice

Use a 10-stop type ramp (`xs` 13 → `7xl` 56 px) with line-height and
letter-spacing baked into the token. Bodies sit at zero tracking; only
display sizes (`2xl` and up) carry negative letter-spacing, escalating
from `-0.2px` at `2xl` to `-2.2px` at `6xl`/`7xl`. Cash Sans is the only
bundled face, with three weight loads (Regular 400, Medium 500, Medium
again at 600) — there is no separate semibold cut, by design. Tiny
operational labels are the main escape hatch: the app uses `text-[10px]`
and `text-[11px]` in dense tool, avatar, and chart surfaces.

**Evidence:**
- `--text-xs: 0.8125rem` (13px) → `--text-7xl: 3.5rem` (56px); 10 sizes total (theme.css:1011-1053)
- `--text-2xl--letter-spacing: -0.2px`, `3xl: -0.4px`, `4xl: -0.5px`, `5xl: -1.4px`, `6xl/7xl: -2.2px`
- `--text-xs/sm/base/lg/xl--letter-spacing: 0` — body sizes intentionally zero
- The survey records six arbitrary typography values; `10px` appears 13 times and `11px` appears 6 times, both in compact operational surfaces
- `--font-sans: 'Cash Sans', ui-sans-serif, system-ui, sans-serif, ...` (theme.css:547)
- `@font-face` declarations load CashSans-Regular (400), CashSans-Medium (500), CashSans-Medium again (600) from `cash-f.squarecdn.com` (globals.css:5-33)

### elevation

Build depth as a continuous numeric ramp, not as named roles. Eight
shadow tokens (2xs / xs / sm / md / lg / xl / 2xl / inner) compose a
fixed 2px ambient layer with a directional offset that scales 0→4→8→16→24
→48 px. Dark mode does not redefine shadows — the ambient layer is faint
enough on dark surfaces and the directional layer carries the read. The
notable exception is the automation schedule popover, which uses two
larger arbitrary shadows for glassy, focused controls.

**Evidence:**
- `--shadow-2xs: 0 1px 0 0 rgba(0,0,0,0.05)` — flat highlight
- `--shadow-xs: 0 0 1px 0 rgba(0,0,0,0.05)`
- `--shadow-sm/md/lg/xl: 0 0 2px 0 rgba(0,0,0,0.1), 0 [4|8|16|24]px [8|16|32|48]px [-2|-4|-8|-12]px rgba(0,0,0,0.06–0.1)` — composed pairs (theme.css:1004-1007)
- `--shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.25)` — outlier, only one declared
- `--shadow-inner: inset 0 0 1px 0 rgba(0,0,0,0.40)`
- `.dark` block omits all `--shadow-*` declarations — single source for both themes
- Refreshed survey records 5 arbitrary shadow observations: `0 18px 45px rgba(0,0,0,0.4)` and `0 24px 60px rgba(0,0,0,0.4)` in automation popovers

### theming-architecture

Cascade two layers inside `.managerbot-ui-root`: a raw color-ramp +
scalar layer, then a semantic alias layer re-declared under `.dark` and
the `force-light` utility. Tailwind's `@theme inline` block re-exports
tokens as `--color-*` / `--text-*` / `--radius-*` / `--shadow-*`, and the
same `--color-*` mappings are mirrored inside `.managerbot-ui-root` so
Tailwind utilities resolve against the scoped source tokens. Components
prefer semantic tokens or Tailwind utilities; raw literals are local
exceptions, not the architecture.

**Evidence:**
- `.managerbot-ui-root` carries 396 color tokens (raw ramps) + ~30 semantic aliases (`--background`, `--primary`, ...)
- `.dark .managerbot-ui-root, .managerbot-ui-root.dark` re-declares only the semantic aliases — raw ramps inherit
- `@utility force-light` re-declares the same semantic set against light values, used to pin chrome to a light register inside dark surfaces
- `@theme inline { --color-*: var(--*); }` re-exports every token for Tailwind v4 class-atom generation, with mirrored scoped mappings above it
- `@source "../**/*.{ts,tsx}"; @source "../**/*.stories.{ts,tsx}";` (globals.css:35-36) bounds Tailwind's content scan

### token-architecture

Hold every system literal in the token layer; let alias chains carry semantics.
Of 459 declared tokens, ~30 semantic surface tokens (`--primary`,
`--card`, `--accent`, ...) chain via `var(--neutral-*)` to a raw step;
chart tokens (`--chart-1`..`--chart-15`) chain to chosen ramp stops
across sky/teal/cyan/emerald/lime/green; raw ramp tokens are leaves
(`oklch(...)`). The `@theme inline` re-exports add a second alias layer
for Tailwind class atoms but do not change semantics — they exist purely
so `bg-primary` resolves. The consuming app has a visible exception
layer of arbitrary class values and inline colors; those should be
treated as product-surface exceptions unless promoted back into tokens.

**Evidence:**
- 459 canonical tokens (excluding `@theme inline` mechanical re-exports)
- 396 color tokens; 12 spacing/layout; 34 typography (10 size triples + font-sans + 3 line-height defaults); 8 radius; 8 shadow; 1 motion
- Alias chains observed in semantic surface tokens, semantic state tokens, chart slots, and sidebar slots
- Raw color ramps (e.g. `--neutral-50: oklch(95.42% 0.0000 89.88)`) are leaves — no chains
- The Tailwind palette extension (`--slate-*`, `--gray-*`, `--zinc-*`, `--stone-*`, `--rose-*`, `--orange-*`, `--amber-*`, `--lime-*`, `--emerald-*`, `--teal-*`, `--cyan-*`, `--sky-*`, `--indigo-*`, `--violet-*`, `--fuchsia-*`, `--pink-*`) is included for chart use only — present but not wired into semantic tokens
- 25 values have arbitrary-class usage and 28 values have inline-literal usage in the app/story/chart layer; these are evidence of local product exceptions, not new canonical tokens

### composition-patterns

Use task-shaped composition instead of letting every answer collapse into
cards. The core language supports a conversation workspace for active AI
work, tracker lists for sessions and tasks, a dashboard/tracker posture
for Pulse metrics and insights, and compact control surfaces for
automation setup. Cards exist as repeated insight or suggestion modules,
but they are one shape among several; dense View sections and Item rows
carry much of the operational product.

**Evidence:**
- `Managerbot conversation surface` survey row: prompt controls, conversation pane, artifacts, and AI-elements compose the primary agent workspace
- `Pulse dashboard` survey row: wide View content, section stack, metric cards, and pinned widgets form a tracker/dashboard shape
- `Tasks list` survey row: narrow View content, `ItemGroup`, skeletons, and empty state produce a sectioned task tracker rather than cards
- `Automation management` survey row: panel lists, suggested automation cards, and compact popover controls combine control-surface and card shapes

### motion

Motion is reserved for functional state transitions; decorative animation
is absent. The system declares exactly one motion token
(`--animate-highlights-tab-fade-in: 150ms ease forwards`) and three
keyframes (`highlights-progress-fill`, `highlights-progress-drain`,
`highlights-tab-fade-in`) that serve a single feature surface (tabbed
highlights with progress). Component code uses Radix's data-state
attributes and `motion`/`framer-motion` for entry/exit, while
`animate-spin` is common for loading states; hover-bounce and decorative
loops are not part of the language.

**Evidence:**
- `--animate-highlights-tab-fade-in: highlights-tab-fade-in 150ms ease forwards` (theme.css:1055)
- `@keyframes highlights-progress-fill / -drain / -tab-fade-in` (globals.css:44-72)
- `tw-animate-css` imported in globals.css:3 — provides `animate-in/out` utilities for Radix data-state
- `motion` (catalog dep) and `framer-motion` (catalog dep) used in `managerbot-web` for entry transitions
- The survey records 1 motion token and 23 `animate-spin` observations across 16 files; both are functional rather than decorative

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
- No `--font-mono` or `--font-serif` declared in the survey — code blocks rely on UA defaults via Tailwind's `font-mono` class
