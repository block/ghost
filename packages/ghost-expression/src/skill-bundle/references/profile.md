---
name: profile
description: Interpret a bucket.json into expression.md — the subjective synthesis stage of a scan.
handoffs:
  - label: Compare against another expression
    command: ghost-drift compare
    prompt: Compare the expression.md I just wrote against another expression
  - label: Emit a project-scoped drift review command
    command: ghost-expression emit review-command
    prompt: Emit a per-project review command derived from this expression.md
---

# Recipe: Profile a project into expression.md

**Goal:** produce a valid `expression.md` that captures the project's design language as an interpretation. **You are the interpreter, not the surveyor.** Read the `bucket.json` as ground truth for what values the project actually ships; write decisions, form the prose body, and fill the structured token blocks. Do not re-extract values from source — that's the surveyor's job and you'd be doing it twice.

`expression.md` is the terminal artifact in a three-stage scan: topology (`map.md`) → objective (`bucket.json`) → subjective (`expression.md`). Yours is the third stage.

## Pre-requisites

Two artifacts must exist before you start:

- `map.md` — `ghost.map/v1`. Read its frontmatter for repo kind signals (`composition.frameworks`, `composition.styling`, `design_system.token_source`, `platform`, `registry`). Read its body for context on identity / topology / conventions.
- `bucket.json` — `ghost.bucket/v1`. Lint-clean. Carries every concrete value, token, and component the surveyor observed, with occurrence counts and (for tokens) alias chains.

If either is missing, **stop**. Run topology and survey first. Inventing an expression from incomplete inputs poisons every downstream comparison.

## How to read the bucket

A `bucket.json` has three sections:

- **`values[]`** — concrete literals shipped in source. Group by `kind`: `color` rows feed `palette`; `spacing` rows feed `spacing.scale` / `spacing.baseUnit`; `typography` rows feed `typography.*`; `radius` rows feed `surfaces.borderRadii`; `shadow` rows feed `surfaces.shadowComplexity` (count + complexity, not literal shadows); `breakpoint` / `motion` / `layout-primitive` rows feed Decisions where they're load-bearing. Each row has `occurrences` (total count) and `files_count` (spread). Higher numbers = stronger signal.
- **`tokens[]`** — named declarations with `alias_chain` (path through indirection) and `resolved_value`. Long chains and semantic naming (`--color-brand-primary` → `--color-orange-500`) are evidence of a deliberate token layer. Empty chains everywhere = inline literals = no token discipline.
- **`components[]`** — known components (registry entries or heuristically discovered). Contributes count signal to surface-vocabulary decisions and grounds prose about what the system ships.

External libraries (icon sets, primitive collections, motion libs) deliberately don't have a bucket section — whether a system uses Radix or hand-rolls primitives doesn't change what its design language *is*. When a library is load-bearing for the design language (icon family choice, font sourcing), cite it as prose evidence under the relevant decision dimension; don't expect it as structured data.

Read `bucket.json` once, fully. Then keep it open while you write.

## Steps

### 1. Detect repo kind from map.md

Branch the rest of the recipe on signals from `map.md`. Apply rules in order; first match wins:

1. `design_system.token_source: external` → **consumer mode**. The repo imports tokens from another package; the bucket's `tokens[]` is mostly empty or full of upstream slugs. Don't try to interpret upstream values you didn't observe.
2. `composition.frameworks` includes `style-dictionary`, or there's a `tokens/` directory and no `registry`, and the bucket has long alias chains (3+ steps) → **token-pipeline mode**. Components are graph nodes; layering is a first-class decision.
3. `registry.path` set, or `composition.styling` includes `tailwindcss*` / `css-modules` / similar → **ui-library mode** (default).
4. `platform` is an array spanning native + web with no single dominant build → **multi-platform**: profile as ui-library but expect coarser groupings; the bucket likely has fewer rows per dialect.

Note the chosen mode in your scratchpad — it shapes Steps 3, 4, and 5.

### 2. Layer 1 — Observation (holistic prose)

Subjective. 2–4 sentences capturing what this design language is and how it feels. Read the bucket *and* sample 3–5 high-occurrence files to actually see the surfaces — counts alone don't tell you the visual register.

Then in frontmatter:

- `personality`: 3–6 adjectives (`utilitarian`, `editorial`, `dense`, `playful`, `restrained`, …)
- `distinctiveTraits`: what makes this expression *visually recognizable* — include notable absences ("no decorative elements at all", "no shadows anywhere despite a dark theme")
- `resembles`: 1–3 well-known references (Linear, Geist, Material 3, …) — only if genuinely close

### 3. Layer 2 — Design Decisions (abstract prose with evidence)

Name the pattern, not the token:

- ✗ Weak: "Spacing follows a 4px base grid with Tailwind defaults." (restates a fact already in the bucket)
- ✓ Strong: "Prefer explicit component-height tokens over padding arithmetic, so button/input sizing is decoupled from surrounding layout." (names the pattern and its consequence)

Surface whatever dimensions fit. Common ones: `color-strategy`, `spatial-system`, `typography-voice`, `surface-hierarchy`, `density`, `motion`, `elevation`, `interactive-patterns`, `token-architecture`. **Absences are decisions** — "No animation — interactions are immediate and non-kinetic" is valid (evidence: empty `motion` rows in the bucket).

For each decision: `dimension` (slug), `decision` (prose, body), `evidence` (concrete citations from the bucket — preferred form: token definitions like `"--radius-pill: 999px"` or value rows like `"#f97316 (47 occurrences across 12 files)"`).

**Evidence belongs in the body markdown under `**Evidence:**` bullets per dimension. Do NOT put `evidence:` arrays in frontmatter — the schema is `.strict()` and will reject.** Each `### <dimension>` body block should end with a `**Evidence:**` line followed by bullet citations from the bucket; the parser pulls those back onto `decisions[].evidence` in memory.

Mode-specific framing:

- **Consumer** — overrides are decisions ("App ships its own `@font-face` instead of inheriting upstream sans" — evidence: a `--font-*` token row whose value differs from the upstream's, plus prose citing the manifest dependency).
- **Token-pipeline** — layering choices are decisions ("Component layer never references base tokens directly — always via semantic" — evidence: bucket `tokens[].alias_chain` lengths).
- **Ui-library** — registry posture is a decision ("Components ship as a flat library with no theme variants" — evidence: bucket `components[]` shape).
- **Multi-platform** — divergence between dialects is a decision when present ("Web and iOS palettes are intentionally different — web is restrained, iOS reuses system colors" — evidence: per-source counts in merged buckets, or noted in the survey scratchpad).

### 4. Layer 3 — Concrete tokens (read from bucket; do not invent)

Populate the structured frontmatter fields **from bucket rows**:

- `palette.dominant` — top color rows by `occurrences`, with role assigned. Use bucket `role_hypothesis` when present and you agree; override when you don't. Cite the role.
- `palette.neutrals` — neutral-saturation color rows (low chroma — check the `spec.hsl.s` if present, or judge from the hex). `count` is the row count, `steps` is the literal hex array.
- `palette.semantic` — color rows whose `role_hypothesis` or naming suggests success/warning/error/info. Empty array if none.
- `palette.saturationProfile` — `muted` / `vibrant` / `mixed`. Judge from the chroma distribution of dominant colors.
- `palette.contrast` — `low` / `medium` / `high`. Judge from neutrals' lightness range.
- `spacing.scale` — sorted distinct scalar values from `kind: spacing` rows. Convert rem/em to px (1rem = 16px) before recording.
- `spacing.baseUnit` — the GCD of scale entries, or the smallest scalar that divides most others.
- `spacing.regularity` — 1.0 if the scale is a clean modular sequence (4, 8, 16, 24, …), lower as it diverges.
- `typography.families` — distinct `family` values from `kind: typography` rows.
- `typography.sizeRamp` — distinct font sizes (in px) from `kind: typography` rows.
- `typography.weightDistribution` — map of weight → relative frequency from `kind: typography` rows.
- `typography.lineHeightPattern` — `tight` / `normal` / `loose` / `mixed`, judged from `line_height` values.
- `surfaces.borderRadii` — distinct scalars from `kind: radius` rows.
- `surfaces.shadowComplexity` — `deliberate-none` (zero shadow rows + you confirmed it's intentional), `simple` (1–2 distinct shadow specs), `layered` (3+), `expressive` (varied + non-default).
- `surfaces.borderUsage` — `none` / `minimal` / `prominent`, judged from how often borders appear in samples (the bucket may not surface this directly — read 2–3 component files if in doubt).

**Hard rule:** every value you put in `palette` / `spacing` / `typography` / `surfaces` must trace to a row in `bucket.json`. If it isn't in the bucket, it isn't in the expression. A missing field beats a fabricated one. If the bucket is sparse for a dimension (e.g. only one shadow), reflect that — `shadowComplexity: simple` with one shadow is honest; making up a layered system is a lie.

**Hard rule:** every `palette` entry must be cited in at least one decision's `evidence`, or dropped. Uncited tokens are noise.

### 5. Write the file

Copy [../assets/expression.template.md](../assets/expression.template.md). Fill in:

- **Frontmatter:** all structured fields (identity, `observation.personality`/`.resembles`, `decisions[].dimension`, `palette`, `spacing`, `typography`, `surfaces`).
- **Body:** `# Character` (observation summary), `# Signature` (distinctiveTraits bullets), `# Decisions` (one `### <dim>` block per decision, each ending with `**Evidence:**` bullets citing bucket rows).

Partition matters. See [schema.md](schema.md) for which field lives where.

### 6. Validate

    ghost-expression lint expression.md

Fix any errors. Common ones:

- Prose in frontmatter → move to body.
- `### dim` with no matching `decisions[]` entry → remove the orphan.
- Palette entry not cited in any evidence → cite it (from a bucket row) or drop it.
- Typography size not in the bucket → drop it; the surveyor missed it or it's not real.

### 7. Provenance check

For every value in your expression's frontmatter, confirm it appears in `bucket.json`. Quick sanity:

    jq -r '.values[] | select(.kind=="color") | .value' bucket.json | sort -u
    # compare against your palette entries

Any expression value that doesn't trace back is a hallucination. Remove it.

### 8. Self-distance sanity

    ghost-drift compare expression.md expression.md

Self-distance must be 0. Anything else means the file isn't deterministically loadable.

## When the bucket is incomplete

If the surveyor's `bucket.json` has known gaps (a `# Coverage` note in the survey scratchpad, or thin coverage for a dialect), surface them in the expression's `# Character` body or as a Decision (e.g. `### scan-coverage` with evidence "iOS dialect under-sampled — only 23 color sites recorded; web dialect is the dominant signal in this expression"). Do not paper over gaps with invented values.

## When you cannot profile

If `bucket.json` is empty (a backend-only repo, no UI) and `map.md` confirms no design system, say so in `# Character` and emit a minimal expression with empty palette/spacing/typography/surfaces. Do not fabricate. A placeholder expression poisons every downstream comparison.
