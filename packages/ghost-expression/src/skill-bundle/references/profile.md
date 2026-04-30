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

Subjective. 2–4 sentences capturing what this design language is and how it feels. Read the bucket *and* sample 3–5 high-occurrence files to actually see the surfaces — counts alone don't tell you the visual register. The prose lives under `# Character` in the body.

Then in frontmatter:

- `personality`: 3–6 adjectives (`utilitarian`, `editorial`, `dense`, `playful`, `restrained`, …)
- `resembles`: 1–3 well-known references (Linear, Geist, Material 3, …) — only if genuinely close

Notable absences ("no decorative elements at all", "no shadows anywhere despite a dark theme") are *not* prose to write here — they're rules with `presence_floor: 0` (or a small integer) authored in Step 3, which causes any addition to escalate severity. Codifying absences as enforceable rules beats restating them in prose.

### 3. Layer 2 — Rules (curated, grep-friendly, perceptual-prior-aware)

This is the load-bearing step. **Your job is to propose 5–15 candidate rules, score each by bucket-derived support, and present the ranked list to the human curator.** The curator promotes the sharpest 5–10 to `rules[]`. You do not author final rules unilaterally — design taste is human-curated, agent-proposed.

(Legacy: this stage previously authored `decisions[]` — abstract per-dimension prose. That format is preserved during the v0 transition for backward compatibility, but the canonical authoring surface is now `rules[]`. The emitter prefers `rules[]` when present.)

#### 3a. Propose candidate rules

Walk the bucket and pose: *what pattern is this project consistently following that deserves codification?* Each candidate rule has the shape:

```yaml
- id: <kebab-slug>          # stable, slug-style
  canonical: <dimension>     # optional but strongly preferred (see vocabulary below)
  kind: <RuleKind>           # optional; drives default match shape
  summary: <one line>        # what the rule says in plain English
  rationale: <prose>         # why the rule exists; cites the bucket
  pattern: <regex or string> # what the reviewer greps for
  enforce_at: [...]          # className / css_var / inline_style / import
  support: 0.0–1.0           # computed: bucket conformers / total observed
  presence_floor: <int>      # optional; default 0
```

**Pick `canonical` from the controlled vocabulary first.** Twelve dimensions cover the orthogonal axes a designer makes deliberate calls on:

| Slug | Captures | Default tier |
|---|---|---|
| `color-strategy` | hue as decoration vs. communication; default-mono vs. branded | loud |
| `font-sourcing` | bundled vs. consumer-supplied; preferred families | loud |
| `surface-hierarchy` | named-by-intent vs. named-by-shade; surface vocabulary | structural |
| `shape-language` | radius philosophy (pill, uniform, geometric, organic) | structural |
| `typography-voice` | type-as-instrument; editorial vs. utility; scale rhythm | structural |
| `elevation` | shadow vocabulary; named-by-role vs. numeric; dark-mode treatment | structural |
| `interactive-patterns` | focus, hover, active feedback conventions | structural |
| `spatial-system` | spacing scale, base unit, padding philosophy | rhythmic |
| `density` | compact controls vs. spacious containers (paired with spatial, distinct) | rhythmic |
| `motion` | animation as functional vs. decorative; presence vs. absence | rhythmic |
| `theming-architecture` | runtime themability; cascade structure; override patterns | rhythmic |
| `token-architecture` | alias-chain depth; semantic vs. raw; layering discipline | rhythmic |

The **default tier** is the perceptual weight: loud rules render as Critical, structural as Serious, rhythmic as Nit in the emitted reviewer. Severity is computed by the emitter from `canonical` + `presence_floor`; you don't usually set `severity` directly.

#### 3b. Score support from the bucket

For each candidate rule, compute support — *the fraction of observed cases that already conform*. Concretely:

- **`no-off-palette-hex`** (color-strategy) — `support = (bucket color rows with value in palette set) / (total bucket color rows)`. If 31 of 33 colors are in the palette, support is 0.94.
- **`pill-interactives`** (shape-language) — `support = (interactive components using rounded-full) / (interactive components observed)`. Walk `bucket.components` for Button/Input/Badge; check radii.
- **`spacing-on-scale`** (spatial-system) — `support = (spacing rows with value ∈ scale) / (total spacing rows)`. The scale lives in `expression.spacing.scale`.

Rule of thumb: **drop candidates with support < 0.85.** Below that threshold, the project hasn't actually committed to the pattern — codifying it generates noise. A `support: 0.6` rule looks aspirational, not enforced.

#### 3c. Identify presence-floor candidates

The perceptual prior escalates rules one tier when the bucket count for the dimension is ≤ `presence_floor`. Use this to capture *negative space* — what the project deliberately *isn't*:

- Bucket has 0 motion rows → `no-decorative-motion` rule with `presence_floor: 4` (any addition crosses zero, escalates to critical).
- Bucket has 0 gradient values → `no-gradients` with `presence_floor: 0`.
- Bucket has 0 bundled fonts → `no-foreign-fonts` with `presence_floor: 0`.

Don't set a presence floor when the dimension is well-populated — the escalation will never trigger and the field becomes noise.

#### 3d. Present the ranked list to the curator

Sort candidates by support, descending. Present each as: id + canonical + summary + support % + 1-line rationale. Mark presence-floor escalations explicitly. Recommend cuts: anything below 0.85, anything redundant with another rule, anything where the pattern is too fuzzy to enforce.

The curator picks 5–10. **Do not paste your full candidate list into `rules[]`.** Wait for the human to promote.

#### Mode-specific framing

- **Consumer** — overrides are rules. App-side `@font-face` that differs from upstream → a `font-sourcing` rule with `presence_floor: 0` against the upstream's font set.
- **Token-pipeline** — layering posture is a rule. "Component layer never references base tokens directly" → a `token-architecture` rule whose pattern catches `--component-* references --base-*`.
- **Ui-library** — registry shape is a rule. "Components have no theme variants" → an `interactive-patterns` rule against `data-theme=` attributes.
- **Multi-platform** — divergence is rules. "iOS reuses system colors but web doesn't" → two color-strategy rules, one per dialect, each with its own `enforce_at`.

#### Absences are rules — codify them with `presence_floor`

Don't try to express "this project has no animation" as prose. Express it as: a motion rule whose `presence_floor` causes any addition to escalate to critical. The emitted reviewer will catch the addition without the prose.

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
- **Body:** `# Character` (observation summary), `# Decisions` (one `### <dim>` block per decision, each ending with `**Evidence:**` bullets citing bucket rows).

Partition matters. See [schema.md](schema.md) for which field lives where.

### 6. Validate

**Preferred (CLI present):**

    ghost-expression lint expression.md

Fix any errors.

**Prose fallback (no CLI):**

Walk the file against the schema in [schema.md](schema.md). Required checks:

- Frontmatter parses as valid YAML.
- Required fields: `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`.
- Body sections appear in order: `# Character`, `# Decisions` (when decisions are present). No prose in frontmatter.
- For any `### dim` block in the body, a matching `decisions[].dimension` entry exists in frontmatter (and vice versa).
- For any `rules[]` entry: `id` is unique, `pattern` is non-empty, optional `severity` ∈ `{critical, serious, nit}`, optional `match` ∈ `{exact, band, percent, structural}`, optional `support` ∈ `[0, 1]`.

Common errors regardless of path:

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

**Preferred (CLI present):**

    ghost-drift compare expression.md expression.md

Self-distance must be 0. Anything else means the file isn't deterministically loadable.

**Prose fallback (no CLI / no ghost-drift):**

Re-load the file mentally: parse the frontmatter, normalize whitespace in the body, then verify the file would round-trip through a YAML parser without info loss. If you can't be sure, run the CLI (it's the calculator that exists for exactly this question). The self-distance check is genuinely a "machine math" answer — prose verification is best-effort, not authoritative.

## When the bucket is incomplete

If the surveyor's `bucket.json` has known gaps (a `# Coverage` note in the survey scratchpad, or thin coverage for a dialect), surface them in the expression's `# Character` body or as a Decision (e.g. `### scan-coverage` with evidence "iOS dialect under-sampled — only 23 color sites recorded; web dialect is the dominant signal in this expression"). Do not paper over gaps with invented values.

## When you cannot profile

If `bucket.json` is empty (a backend-only repo, no UI) and `map.md` confirms no design system, say so in `# Character` and emit a minimal expression with empty palette/spacing/typography/surfaces. Do not fabricate. A placeholder expression poisons every downstream comparison.
