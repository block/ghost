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

- `design_system.entry_files` — the canonical token sources. Resolve every variable chain in these files end-to-end.
- `design_system.paths` — the directories the design language lives in (one repo may have several).
- `design_system.token_source` — `inline` / `external` / `mixed`. Drives Step 1.5.
- `registry`, `composition.frameworks`, `composition.styling`, `platform` — also feed Step 1.5.
- `feature_areas[].sub_areas[]` — the surfaces or layers worth sampling.

Map.md eliminates location-discovery on monorepos. If `map.md` is **missing**, prompt the user to run `ghost-map inventory` first. Fallback inline discovery: `tailwind.config.{js,ts}`, `@theme {}` blocks, `styles/globals.css`, `tokens/` dirs, SCSS variable files, TypeScript theme objects, shadcn `:root { --… }`, JSON token files. Use Glob/Grep; read real files.

### 1.5. Detect repo kind

Branch the rest of the recipe on signals from map.md. Apply rules in order; first match wins:

1. `design_system.token_source: external` → **consumer mode**. The repo imports tokens from another package; it doesn't declare them.
2. `composition.frameworks` includes `style-dictionary` (or there is a `tokens/` directory and no `registry`) → **token-pipeline mode**. Components are YAML graph nodes, not tsx.
3. `registry.path` set, or `composition.styling` includes `tailwindcss*` / `css-modules` / similar with component files in `ui_surface.include` → **ui-library mode** (default).
4. `platform` is an array spanning native + web with no single dominant build → **multi-platform**: profile as ui-library but expect coarser `feature_areas` and prefer modules named `*UI` / `*View` / `*Screen`; skip `*Fakes` / `*Mocks` / `*Tests`.

If signals overlap (e.g. both a `registry` and a `tokens/` pipeline coexist), prefer **token-pipeline** when `entry_files` are YAML/JSON graphs and **ui-library** when `entry_files` resolve to CSS/code. Note the chosen mode in your scratchpad — Step 4 onward depends on it.

### 2. Resolve variable chains end-to-end

If a value is a reference, follow it: `--btn-bg: var(--color-primary)` → `--color-primary: var(--brand-500)` → `--brand-500: #0066cc`. Record the resolved concrete value.

For **token-pipeline** repos, a chain crosses *layers*: component → semantic → base. Walk all three. Surface light/dark pairs together (the same component slot will reference one semantic name that resolves differently per mode).

For **consumer** repos, chains often dead-end at an external import (`import theme from "@market/market-theme"`, `Color.Background.app`). Don't try to resolve to hex — record the upstream slug as the value. The expression describes *what shows up in product code*, not what the upstream declares.

### 3. Sample for the roles layer

Sampling depends on repo kind (Step 1.5):

- **UI-library (default)** — open 6–10 component files: typography primitives, `Button`, `Card`, `Input`, list/table primitives, plus a couple from each `feature_areas[].sub_areas[]` cluster. Populate `roles[]` from imports and class bindings. `feature_areas` are component categories (input / display / feedback / navigation / layout) or AI-element clusters (chat / agent-state / artifacts) — match the registry's `categories` field if present.
- **Token-pipeline** — read 3–5 component-layer YAMLs end-to-end through the layer chain. `roles[]` is populated from semantic-layer mappings (which semantic alias each component slot references), not from imports. Skip product surfaces; `feature_areas` here are token-architecture layers (base / semantic / component) and/or platform output sinks (web / ios / android), 6–15 typical for a multi-layer pipeline.
- **Consumer mode** — sample 6–10 product UI files. Don't resolve tokens to hex; record which upstream slugs (`var(--core-radius-md)`, `Color.Background.app`) appear most often in product code. Where the consumer overrides upstream (custom `@font-face`, a local `theme.css` with primitive tokens), surface that as a Decision. `feature_areas` remain product surfaces — the consumer is an app.

Only record what you directly observed. Empty `roles` is fine.

### 4. Form Layer 1 — Observation (holistic)

Write subjectively. 2–4 sentences capturing what this design language is and how it feels. Then:

- `personality`: 3–6 adjectives (`utilitarian`, `editorial`, `dense`, `playful`, …)
- `distinctiveTraits`: what makes this expression *visually recognizable* — include notable absences ("no decorative elements at all")
- `resembles`: 1–3 well-known references (Linear, Geist, Material 3, …)

### 5. Derive Layer 2 — Design Decisions (abstract)

Name the pattern, not the token:

- ✗ Weak: "Spacing follows a 4px base grid with Tailwind defaults." (restates a fact visible in the tokens)
- ✓ Strong: "Prefer explicit component-height tokens over padding arithmetic, so button/input sizing is decoupled from surrounding layout." (names the pattern and its consequence)

Surface whatever dimensions fit. Common ones: `color-strategy`, `spatial-system`, `typography-voice`, `surface-hierarchy`, `density`, `motion`, `elevation`, `interactive-patterns`. **Absences are decisions** — "No animation — interactions are immediate and non-kinetic" is valid. In **consumer** mode, override patterns are decisions ("App ships its own `@font-face` instead of inheriting upstream sans"); in **token-pipeline** mode, layering choices are decisions ("Component layer never references base tokens directly — always via semantic").

For each: `dimension` (slug), `decision` (prose, body), `evidence` (concrete citations — token definitions like `"--radius-pill: 999px"` preferred; `file:line` for behavioral observations).

### 6. Extract Layer 3 — Concrete tokens

Populate the structured fields: `palette.dominant`, `palette.neutrals`, `palette.semantic`, `palette.saturationProfile`, `palette.contrast`, `spacing.scale`, `spacing.regularity`, `spacing.baseUnit`, `typography.families`, `typography.sizeRamp`, `typography.weightDistribution`, `typography.lineHeightPattern`, `surfaces.borderRadii`, `surfaces.shadowComplexity`, `surfaces.borderUsage`.

- Convert rem/em to px (1rem = 16px). Output colors as hex (`#1a1a1a`); the CLI computes oklch automatically.
- Every `palette` entry must be cited in at least one decision's `evidence`, or dropped. Uncited neutrals are noise.
- In **consumer** mode, fields you can only see as upstream slugs may be left empty rather than fabricated. A missing field beats an invented one.

### 7. Write the file

Copy [../assets/expression.template.md](../assets/expression.template.md). Fill in:

- **Frontmatter:** all structured fields (identity, `observation.personality`/`.resembles`, `decisions[].dimension`/`.evidence`, `palette`, `spacing`, `typography`, `surfaces`, `roles`).
- **Body:** `# Character` (observation summary), `# Signature` (distinctiveTraits bullets), `# Decisions` (one `### <dim>` block per decision).

Partition matters. See [schema.md](schema.md) for which field lives where.

### 8. Validate

    ghost-expression lint expression.md

Fix any errors. Common ones: prose in frontmatter → move to body; `### dim` with no matching `decisions[]` entry → remove the orphan; palette entry not cited in any evidence → cite it or drop it.

### 9. Sanity check

    ghost-drift compare expression.md expression.md    # self-distance should be 0

## When you cannot profile

If the project has no styling (backend-only, no UI), say so. Do not fabricate an expression. A placeholder expression poisons every downstream comparison.
