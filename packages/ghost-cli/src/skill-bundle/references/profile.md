---
name: profile
description: Write fingerprint.md from a project's design sources.
handoffs:
  - label: Compare against a parent or peer fingerprint
    skill: compare
    prompt: Compare the fingerprint.md I just wrote against a parent or peer
  - label: Emit a project-scoped drift review command
    command: ghost emit review-command
    prompt: Emit a per-project review command derived from this fingerprint.md
---

# Recipe: Profile a project into fingerprint.md

**Goal:** produce a valid `fingerprint.md` that captures the project's visual language. Ghost's CLI does not call an LLM for this — you, the host agent, explore the repo and synthesize the result, then hand it to `ghost lint` for validation.

## Steps

### 1. Locate design sources

Start from the project root. Look for:

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

Record the resolved concrete value. Stopping at the first indirection produces useless fingerprints.

### 3. Read component files (for the roles layer)

Open 3-6 component files: typography primitives (`H1`, `P`), `Button`, `Card`, `Input`, list/table primitives. Record which tokens bind to which semantic slot:

- "h1 = serif 52px / weight 500"
- "Button uses `--primary` background with 8px radius"

These become `roles[]`. Only record what you directly observed. Projects with no component files may produce empty `roles` — that's fine.

### 4. Form Layer 1 — Observation (holistic)

Write subjectively. 2-4 sentences capturing what this design language is and how it feels. Then:

- `personality`: 3-6 adjectives (`utilitarian`, `editorial`, `dense`, `playful`, …)
- `distinctiveTraits`: what makes this system *visually recognizable* — include notable absences (e.g. "no decorative elements at all")
- `closestSystems`: 1-3 well-known systems this resembles (Linear, Geist, Material 3, …)

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

Copy [../assets/fingerprint.template.md](../assets/fingerprint.template.md) as a starting point. Fill in:

- **Frontmatter:** all structured fields (identity, `observation.personality`/`.closestSystems`, `decisions[].dimension`/`.evidence`, `palette`, `spacing`, `typography`, `surfaces`, `roles`).
- **Body:** `# Character` (observation summary), `# Signature` (distinctiveTraits bullets), `# Decisions` (one `### <dim>` block per decision, containing the prose rationale).

Partition matters. See [schema.md](schema.md) for which field lives where.

### 8. Validate

    ghost lint fingerprint.md

Fix any errors it reports. Common ones:

- Prose in frontmatter → move to body
- `### dim` in body with no matching `decisions[]` entry (or vice versa) → remove the orphan
- Palette entry not cited in any evidence → cite it or drop it
### 9. Sanity check

    ghost compare fingerprint.md fingerprint.md    # self-distance should be 0

## When you cannot profile

If the project has no styling (backend-only, no UI), say so. Do not fabricate a fingerprint. A placeholder fingerprint poisons every downstream comparison.
