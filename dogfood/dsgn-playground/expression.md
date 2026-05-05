---
id: dsgn-playground
source: llm
timestamp: 2026-05-04T00:00:00Z
sources:
  - squareup/dsgn-playground
  - block/ghost/packages/ghost-ui (reference only)
observation:
  personality:
    - editorial
    - monochromatic
    - media-first
    - kinetic
    - pill-shaped
    - cash-branded
  resembles:
    - ghost-ui
    - Cash App
references:
  specs:
    - src/app.css
    - src/scss/_variables.scss
    - src/scss/_fonts.scss
    - src/scss/_breakpoints.scss
    - src/scss/_mixins.scss
    - src/scss/_editorial.scss
    - src/scss/global.scss
    - src/scss/design-drops.scss
  components:
    - src/lib/components
    - src/lib/animations
  examples:
    - src/routes/+page.svelte
    - src/routes/drops
    - ../../packages/ghost-ui/expression.md
    - ../../packages/ghost-ui/src/styles/main.css
decisions:
  - dimension: color-strategy
  - dimension: font-sourcing
  - dimension: typography-voice
  - dimension: shape-language
  - dimension: spatial-system
  - dimension: surface-hierarchy
  - dimension: elevation
  - dimension: motion
  - dimension: theming-architecture
  - dimension: composition-patterns
checks: []
palette:
  dominant:
    - role: ink
      value: "#1a1a1a"
    - role: page
      value: "#ffffff"
    - role: soft-surface
      value: "#f5f5f5"
    - role: line
      value: "#e5e5e5"
    - role: inverse
      value: "#000000"
  neutrals:
    steps:
      - "#ffffff"
      - "#f5f5f5"
      - "#f2f2f2"
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
    count: 14
  semantic:
    - role: destructive
      value: "#dc2626"
    - role: destructive-dark
      value: "#ef4444"
    - role: success
      value: "#22c55e"
  saturationProfile: muted
  contrast: high
spacing:
  scale: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60, 75, 80, 96, 100, 120, 180, 200, 220]
  regularity: 0.74
  baseUnit: 2
typography:
  families:
    - "Cash Sans"
    - "Cash Sans Wide"
    - "Cash Sans Mono"
    - "Source Code Pro"
    - "Courier"
    - "Helvetica Neue"
  sizeRamp: [10, 11.2, 12, 12.8, 13.6, 14, 14.4, 15.2, 16, 17.6, 18, 20, 24, 28, 32, 35, 40, 45, 48, 55, 56, 128, 192]
  weightDistribution:
    "300": 2
    "400": 7
    "500": 12
    "600": 6
    "700": 6
    "900": 7
  lineHeightPattern: tight
surfaces:
  borderRadii: [0, 2, 4, 6, 10, 12, 16, 999]
  shadowComplexity: layered
  borderUsage: moderate
metadata:
  survey_values: 433
  survey_tokens: 165
  survey_components: 29
  ghost_ui_reference: ../../packages/ghost-ui/expression.md
---

# Character

A monochrome editorial-gallery language with a strong Cash-family voice: wide display type, small metadata, media-as-surface, and black pill chrome. It shares Ghost UI's achromatic discipline, pill controls, and editorial confidence, but it is more kinetic and image-led; motion, parallax, reveal, and full-screen detail transitions are part of the identity rather than decorative trim. Color mostly steps aside so posted work, thumbnails, and media panels become the expressive material.

# Signature

The recognizable move is a full-viewport editorial opening that gives way to dense media grids, dark rounded detail panels, and fixed bottom or corner controls. Output should feel like a curated internal design magazine: black-and-white structure, Cash Sans authority, generous hero scale, tight utility labels, and compact pills or circular controls for actions. Compared with Ghost UI, keep the shared monochrome/pill/editorial foundation but bias toward immersive moving gallery surfaces over reusable catalogue chrome.

# Decisions

### color-strategy

Use achromatic structure by default, with hue reserved for destructive, success, upload/error, media-overlay, or user-supplied content. The token layer defines a grayscale ladder first; applied color repeats the same black/white/gray vocabulary for controls, modal panels, card overlays, text metadata, and dark detail surfaces. Do not add ambient brand gradients or decorative color fills unless the content itself provides the color.

**Evidence:**
- Fresh survey color evidence: 76 color rows, led by `#1a1a1a`, `#ffffff`, `#e5e5e5`, `#000000`, `#f0f0f0`, white alpha overlays, and dark alpha overlays.
- The neutral ladder is `#ffffff`, `#f5f5f5`, `#f2f2f2`, `#f0f0f0`, `#e8e8e8`, `#e5e5e5`, `#cccccc`, `#999999`, `#666666`, `#333333`, `#232323`, `#1a1a1a`, `#0a0a0a`, and `#000000`.
- Semantic hue is narrow: destructive uses `#dc2626` / `#ef4444`, success uses `#22c55e`.
- Theme tokens keep the same vocabulary across light and dark: `--background`, `--foreground`, `--muted`, `--line`, `--surface-dark`, `--accent`, `--contrast`, and their Tailwind `--color-*` aliases.

### font-sourcing

Use Cash Sans as the brand face, Cash Sans Wide for editorial display, and Cash Sans Mono for small metadata or system-flavored subtitles. Fonts are explicitly loaded from Cash-owned font assets; the expression should not drift into generic webfont imports or unrelated display faces. The type identity is closer to Cash App editorial than to a neutral dashboard.

**Evidence:**
- Fresh survey token evidence includes Cash Sans family aliases: `--font-sans`, `--font-display`, `--font-editorial-mono`, `$cashSans`, `$cashSansWide`, and `$cashSansMono`.
- Font-face evidence covers Cash Sans weights 400/500/600/700/900, Cash Sans Mono weights 300/500/700, and Cash Sans Wide weights 400/500/600/700/900.
- Survey typography rows repeatedly observe `Cash Sans`, `Cash Sans Wide`, and `Cash Sans Mono`; `Source Code Pro`, `Courier`, and `Helvetica Neue` appear only as mono/fallback support.

### typography-voice

Typography is editorial, not purely utilitarian: wide uppercase display titles establish the page, while tiny uppercase subtitle labels and compact metadata create rhythm around media. The system permits major scale contrast, including hero display sizes, but most chrome labels stay tight, all-caps, and low-height. Body copy can loosen to 1.6 line-height, yet the visual voice is defined by heavy weight, tight line-height, and negative tracking in headings.

**Evidence:**
- Fresh survey typography evidence: 67 typography rows; weights cluster at 500 (12 occurrences), 400 (7), 900 (7), 600 (6), 700 (6), and 300 (2).
- Editorial display type uses Cash Sans Wide, weight 900, `clamp(3rem, 12vw, 12rem)`, line-height `0.9`, letter-spacing `-0.04em`, uppercase.
- Editorial subtitle type uses Cash Sans Mono, weight 300, `clamp(0.65rem, 0.8vw, 0.85rem)`, letter-spacing `0.1em`, uppercase.
- Heading tokens use 35px / 45px / 55px sizes, `110%` line-height, and negative tracking from `-0.04em` to `-0.02em`.

### shape-language

Shape separates interaction from containers. Buttons, filters, link actions, progress bars, metadata pills, and dock controls are pills or circles; media cards, modals, upload areas, dropdowns, and detail panels use moderate 10-16px rounding. Sharp corners appear only as explicit resets inside media fills or borderless text inputs, not as the default posture.

**Evidence:**
- Fresh survey radius evidence: `border-radius: 999px` appears 14 times across 10 files; `rounded-full` appears 4 times.
- Structural surfaces cluster at `12px` and `16px`, with smaller local affordances at 10px, 6px, 4px, and 2px.
- Pill/control tokens are `--radius-input: 999px`, `--radius-button: 999px`, and `--radius-pill: 999px`; structural tokens are `--radius-card: 12px`, `--radius-card-lg: 16px`, `--radius-card-sm: 10px`, `--radius-dropdown: 10px`, and `--radius-modal: 16px`.

### spatial-system

Spacing is compact at card/grid and form-control scale, then roomy at editorial breaks. Grids and metadata clusters can sit on 4-12px rhythms, controls often use 44-56px heights, and page/section surfaces jump to 75/100/120/200px intervals for magazine breathing room. This is a 2px/4px-compatible system with deliberate editorial leaps, not a purely even component-library scale.

**Evidence:**
- Fresh survey spacing evidence: 162 spacing rows; frequent values include 6px gaps, 8px padding/gaps, 12px gaps/padding, 20px padding, 28px padding, 32px padding, 44px controls, 56px controls, and 60px/75px/100px editorial gaps.
- Control-height tokens are `--spacing-input: 3.25rem` (52px), `--spacing-input-sm: 2.75rem` (44px), `--spacing-button: 2.75rem` (44px), and `--spacing-button-sm: 2rem` (32px).
- Breakpoint evidence is compact and explicit: 480px, 960px, 1440px, and 1920px.
- Large editorial/page values include 75px heading margin, 100px section padding, 120px media/logo sizing, 180-220px upload/media affordances, and 200px transition offsets.

### surface-hierarchy

Surface hierarchy comes from inversion, media framing, borders, and local dark panels rather than many background colors. The main feed is white and content-led; detail and modal flows can invert into near-black panels; cards use subtle borders and overlay pills to keep metadata legible over media. Avoid stacking generic white cards inside white pages unless the task is a form or operational control.

**Evidence:**
- Fresh survey color/surface evidence shows dark detail surfaces built from `#1a1a1a`, `#0a0a0a`, `#f5f5f5`, `rgba(255, 255, 255, 0.08)`, and `rgba(255, 255, 255, 0.5)`.
- Media cards use asset-as-surface with a subtle border, gradient overlay, and black pill metadata.
- Large-screen detail composition uses a dark information panel paired with a white media frame; the surface contrast does more work than elevation.
- Form flows use a white modal shell, borderless text fields, pale upload surfaces, and pill actions rather than nested card stacks.

### elevation

Elevation is present but restrained and named by role. Most hierarchy is flat border/contrast, while popovers, modals, cards, buttons, and focus states use a small shadow vocabulary. Avoid arbitrary deep shadows that make the gallery feel like a SaaS dashboard stack.

**Evidence:**
- Fresh survey shadow evidence: 14 shadow rows, including named usage of `shadow-mini`, `shadow-popover`, `shadow-btn`, `shadow-card`, `shadow-elevated`, `shadow-modal`, and focus/date-field shadows.
- Named shadow tokens cover mini, inset mini, popover, keyboard, button, card, elevated, modal, and date-field focus roles.
- Concrete shadow values include `0 2px 8px rgba(76, 76, 76, 0.15)`, `0 8px 30px rgba(0, 0, 0, 0.12)`, and `0 20px 60px rgba(0, 0, 0, 0.2)`, with darker equivalents in dark mode.

### motion

Motion is one of the signatures. It should communicate gallery browsing, state transitions, filtering, opening detail, and content reveal: scroll-triggered card reveal, grid-to-detail transition, bottom-up modal entrance, streamed hero text, parallax media, and a hand-drawn loading mark. Keep motion functional and tactile; do not replace it with unrelated decorative loops, but preserve the lively 0.1-0.6s interaction range and longer 0.8-1.2s cinematic reveal constants.

**Evidence:**
- Fresh survey motion evidence: 40 motion rows, led by `all 0.15s ease`, GSAP `duration: 0.6`, `duration: 0.5`, `all 0.3s ease`, Tailwind `duration-150`, `expo.out`, and `power2.out`.
- Shared animation constants include grid zoom 1.2s, text reveal 1.2s, scroll reveal 0.8s, Flip 0.6s, card reveal 0.9s, card reveal scale 0.92, and y-offset 80.
- Modal and detail transitions slide from bottom over 0.5-0.6s, reveal content with 0.5s staggered motion, and fade surrounding grids back with 0.3-0.35s opacity transitions.
- Hero and loading states use word streaming, blur/y reveal, title fade, logo fade, and hand-drawn SVG path animation.

### theming-architecture

The theme architecture is inline and project-local: light/dark custom properties feed Tailwind 4 through `@theme inline`, while a parallel SCSS layer carries grayscale, type, radius, breakpoint, and editorial mixins for local composition. This is not a full upstream token package; changes should happen at the token/mixin layer before spreading literals into components.

**Evidence:**
- Fresh survey token evidence: 165 token rows, including 125 unique CSS custom properties, 26 unique SCSS variables, consumed Tailwind defaults, and font-family declarations.
- Theme structure declares `:root`, `.dark`, and `@theme inline`; each `--color-*` alias resolves through semantic variables such as `--background`, `--foreground`, `--muted`, `--border-card`, `--destructive`, and `--contrast` (source provenance: `src/app.css`).
- The SCSS layer holds the grayscale palette, semantic colors, Cash font variables, breakpoint map, editorial type mixins, pill mixin, foreground blends, and page/section heading variables.

### composition-patterns

Composition should be selected by task, with three recurring shapes: an editorial article/hero for public-facing context, a masonry-like media gallery for browsing work, and a split detail/control surface for viewing or creation. Cards are one surface in the gallery, not the default answer shape; modal and detail flows often invert into black panels or borderless form fields. Compared with Ghost UI, keep the editorial and pill DNA but favor immersive media grids and full-screen transitions over registry catalogue pages.

**Evidence:**
- The opening shape pairs a full-viewport hero/wordmark/status area with a downstream grouped media feed.
- Browse surfaces use varied media-card sizing, black pill metadata, subtle borders, and parallax/reveal movement.
- Detail surfaces use an approximately 2/5 information panel and 3/5 media panel at large breakpoints, with dark details and a white media frame.
- Creation flows use borderless form fields, upload media, link pills, contributor comboboxes, and pill submit/cancel actions.
- Ghost UI is a nearby internal expression for monochrome editorial/pill decisions, but this fresh survey shows more motion, media framing, local SCSS composition, and app-specific full-screen transitions.
