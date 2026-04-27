---
name: profile
description: Write expression.md from a project's design sources.
handoffs:
  - label: Compare against another expression
    command: ghost-drift compare
    prompt: Compare the expression.md I just wrote against another expression
  - label: Emit a project-scoped drift review command
    command: ghost-expression emit review-command
    prompt: Emit a per-project review command derived from this expression.md
---

# Recipe: Profile a project into expression.md

**Goal:** produce a valid `expression.md` that captures the project's visual language. Ghost's CLI does not call an LLM for this — you, the host agent, explore the repo and synthesize the result, then hand it to `ghost-expression lint` for validation.

## Steps

### 1. Locate design sources

If a `map.md` is present at the repo root, **use it**. Read its frontmatter:

- `design_system.entry_files` — the canonical token sources (CSS files, theme objects, token definitions). Resolve every variable chain in these files end-to-end.
- `design_system.paths` — the directories the design language lives in (one repo may have several).
- `feature_areas[].sub_areas[]` — product surfaces worth sampling for the `roles[]` layer.

Map.md eliminates location-discovery on monorepos — the navigation card is already done. Skip step 2.

If `map.md` is **missing**, prompt the user to run `ghost-map inventory` and write a map first; that gives every Ghost tool a stable navigation card. As a fallback, do inline discovery:

- `tailwind.config.{js,ts}` and `@theme { ... }` blocks in CSS
- `styles/globals.css`, `app/globals.css`, `index.css`, `theme.css`
- `tokens/`, `design-tokens/`, `theme/` directories
- SCSS variable files (`_variables.scss`, `_tokens.scss`)
- TypeScript theme objects (`const theme = { ... }`)
- shadcn-style CSS variables (`:root { --background: ... }`)
- JSON token files (Style Dictionary, W3C)

Use Glob/Grep to find candidates. Read the real files — don't assume the project follows a convention.

### 2. Resolve variable chains end-to-end

If a value is a reference, follow it:

`--btn-bg: var(--color-primary)` → `--color-primary: var(--brand-500)` → `--brand-500: #0066cc`

Record the resolved concrete value. Stopping at the first indirection produces useless expressions.

### 3. Read component files (for the roles layer)

Open 3-6 component files: typography primitives (`H1`, `P`), `Button`, `Card`, `Input`, list/table primitives. If `map.md` exposed `feature_areas[].sub_areas[]`, sample across distinct surfaces (e.g. one auth screen, one dashboard, one settings panel) rather than re-reading siblings.

Record which tokens bind to which semantic slot:

- "h1 = serif 52px / weight 500"
- "Button uses `--primary` background with 8px radius"

These become `roles[]`. Only record what you directly observed. Projects with no component files may produce empty `roles` — that's fine.

### 4. Form Layer 1 — Observation (holistic)

Write subjectively. 2-4 sentences capturing what this design language is and how it feels. Then:

- `personality`: 3-6 adjectives (`utilitarian`, `editorial`, `dense`, `playful`, …)
- `distinctiveTraits`: what makes this expression *visually recognizable* — include notable absences (e.g. "no decorative elements at all")
- `resembles`: 1-3 well-known references this resembles (Linear, Geist, Material 3, …)

### 5. Derive Layer 2 — Design Decisions (abstract)

Name the pattern, not the token:

- ✗ Weak: "Spacing follows a 4px base grid with Tailwind defaults." (restates a fact visible in the tokens)
- ✓ Strong: "Prefer explicit component-height tokens over padding arithmetic, so button/input sizing is decoupled from surrounding layout." (names the pattern and its consequence)

Surface whatever dimensions fit. There is no fixed list. Common ones: `color-strategy`, `spatial-system`, `typography-voice`, `surface-hierarchy`, `density`, `motion`, `elevation`, `interactive-patterns`. **Absences are decisions** — "No animation — interactions are immediate and non-kinetic" is a valid decision.

For each decision: `dimension` (slug), `decision` (prose, goes in body), `evidence` (list of concrete citations — prefer token definitions like `"--radius-pill: 999px"`; behavioral observations as `file:line` if needed).

### 6. Extract Layer 3 — Concrete tokens

Populate the structured fields: `palette.dominant`, `palette.neutrals`, `palette.semantic`, `palette.saturationProfile`, `palette.contrast`, `spacing.scale`, `spacing.regularity`, `spacing.baseUnit`, `typography.families`, `typography.sizeRamp`, `typography.weightDistribution`, `typography.lineHeightPattern`, `surfaces.borderRadii`, `surfaces.shadowComplexity`, `surfaces.borderUsage`.

- Convert rem/em to px (1rem = 16px).
- Output colors as hex (`#1a1a1a`). The CLI computes oklch automatically.
- Every `palette` entry must be cited in at least one decision's `evidence`, or dropped. Uncited neutrals are noise.

### 7. Write the file

Copy [../assets/expression.template.md](../assets/expression.template.md) as a starting point. Fill in:

- **Frontmatter:** all structured fields (identity, `observation.personality`/`.resembles`, `decisions[].dimension`/`.evidence`, `palette`, `spacing`, `typography`, `surfaces`, `roles`).
- **Body:** `# Character` (observation summary), `# Signature` (distinctiveTraits bullets), `# Decisions` (one `### <dim>` block per decision, containing the prose rationale).

Partition matters. See [schema.md](schema.md) for which field lives where.

### 8. Validate

    ghost-expression lint expression.md

Fix any errors it reports. Common ones:

- Prose in frontmatter → move to body
- `### dim` in body with no matching `decisions[]` entry (or vice versa) → remove the orphan
- Palette entry not cited in any evidence → cite it or drop it

### 9. Sanity check

    ghost-drift compare expression.md expression.md    # self-distance should be 0

## When you cannot profile

If the project has no styling (backend-only, no UI), say so. Do not fabricate an expression. A placeholder expression poisons every downstream comparison.
