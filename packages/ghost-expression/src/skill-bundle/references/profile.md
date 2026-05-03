---
name: profile
description: Interpret a survey.json into expression.md — the expression stage of a scan.
handoffs:
  - label: Compare against another expression
    command: ghost-drift compare
    prompt: Compare the expression.md I just wrote against another expression
  - label: Emit a project-scoped drift review command
    command: ghost-expression emit review-command
    prompt: Emit a per-project review command derived from this expression.md
---

# Recipe: Profile a project into expression.md

**Goal:** produce a valid `expression.md` that captures the project's design language as an interpretation. **You are the interpreter, not the surveyor.** Read the `survey.json` as ground truth for what values the project actually ships; write decisions, form the prose body, and fill the structured token blocks. Do not re-extract values from source — that's the surveyor's job and you'd be doing it twice.

`expression.md` is the terminal artifact in a three-stage scan: map (`map.md`) → survey (`survey.json`) → express (`expression.md`). Yours is the third stage.

Terminal-impact filter:

> A fact belongs in `expression.md` only if it can change a drift verdict or change generated UI.

`survey.json` is evidence. `expression.md` is curated truth. Do not summarize every survey row, every component, or every upstream token. Promote the few repeated constraints, defaults, absences, references, signatures, and token choices that downstream review or generation will actually use.

`survey.json` is not generation prompt context. Read it once for profiling, then write a compact expression that points agents to living source files through `references:` and carries only the digest needed for generation and drift.

## Pre-requisites

Two artifacts must exist before you start:

- `map.md` — `ghost.map/v1`. Read its frontmatter for repo kind signals (`composition.frameworks`, `composition.styling`, `design_system.token_source`, `platform`, `registry`). Read its body for context on identity / topology / conventions.
- `survey.json` — `ghost.survey/v1`. Lint-clean. Carries every concrete value, token, and component the surveyor observed, with occurrence counts and (for tokens) alias chains.

If either is missing, **stop**. Run the map and survey stages first. Inventing an expression from incomplete inputs poisons every downstream comparison.

## How to read the survey

A `survey.json` has three sections:

- **`values[]`** — concrete literals shipped in source. Group by `kind`: `color` rows feed `palette`; `spacing` rows feed `spacing.scale` / `spacing.baseUnit`; `typography` rows feed `typography.*`; `radius` rows feed `surfaces.borderRadii`; `shadow` rows feed `surfaces.shadowComplexity` (count + complexity, not literal shadows); `breakpoint` / `motion` / `layout-primitive` rows feed Decisions where they're load-bearing. Each row has `occurrences` (total count) and `files_count` (spread). Higher numbers = stronger signal.
- **`tokens[]`** — named declarations with `alias_chain` (path through indirection) and `resolved_value`. Long chains and semantic naming (`--color-brand-primary` → `--color-orange-500`) are evidence of a deliberate token layer. Empty chains everywhere = inline literals = no token discipline.
- **`components[]`** — known components (registry entries or heuristically discovered). Contributes count signal to surface-vocabulary decisions and grounds prose about what the system ships.

Rows may carry `source.role` and `resolution` provenance. Interpret these as a source graph: `primary` sources supply usage/salience, while `resolver` sources supply concrete values for symbols the primary actually uses. A resolver-defined value that has no primary usage is not salient for this expression.

External libraries (icon sets, primitive collections, motion libs) deliberately don't have a survey section — whether a system uses Radix or hand-rolls primitives doesn't change what its design language *is*. When a library is load-bearing for the design language (icon family choice, font sourcing), cite it as prose evidence under the relevant decision dimension; don't expect it as structured data.

Read `survey.json` once, fully. Then keep it open while you write.

## Steps

### 1. Detect repo kind from map.md

Branch the rest of the recipe on signals from `map.md`. Apply these conditions in order; first match wins:

1. `design_system.token_source: external` or `sources[]` includes a `resolver` role → **consumer mode**. The repo imports tokens from another package. Interpret upstream values only when primary usage observed them; do not profile the upstream inventory as if it were the app.
2. `composition.frameworks` includes `style-dictionary`, or there's a `tokens/` directory and no `registry`, and the survey has long alias chains (3+ steps) → **token-pipeline mode**. Components are graph nodes; layering is a first-class decision.
3. `registry.path` set, or `composition.styling` includes `tailwindcss*` / `css-modules` / similar → **ui-library mode** (default).
4. `platform` is an array spanning native + web with no single dominant build → **multi-platform**: profile as ui-library but expect coarser groupings; the survey likely has fewer rows per dialect.

Note the chosen mode in your scratchpad — it shapes the references, checks, token digest, and prose you write.

### 2. Direct references (map-derived, expression-facing)

Populate frontmatter `references:` from useful direct paths only:

```yaml
references:
  specs: []
  components: []
  examples: []
```

Use `map.md` as the source for these paths, but do not mention `map.md` in the expression. Good `specs` are token files, theme files, Tailwind configs, style dictionaries, registry manifests, or canonical design docs. Good `components` are component directories or package entrypoints a generator should inspect before inventing UI. Good `examples` are docs, registry examples, Storybook/demo roots, or app routes that show the language in practice.

Keep the lists short and high-signal. If a path would not help generation or drift review, leave it out.

### 3. Layer 1 — Character and Signature

Subjective. 2–4 sentences capturing what this design language is and how it feels. Read the survey *and* sample 3–5 high-occurrence files to actually see the surfaces — counts alone don't tell you the visual register. The prose lives under `# Character` in the body.

Then write `# Signature`: 2–4 sentences about the final picture. Capture dominant moves, recognizable layout posture, repeated composition habits, and the stance the project takes when turning the same specs into output. Signature is not a raw token summary; it is the “how this tends to look when it comes together” section generators should feel in their hands.

Use positive language, not only prohibitions. If the system is restrained, monochrome, quiet, or utilitarian, say how it still creates variety: editorial scale contrast, shaped composition, semantic/data color when color is doing work, role-based elevation, functional motion, local font sourcing, a deliberate type ramp, or themeable tokens. Avoid summaries that collapse into "gray, plain, no decoration"; downstream generators hear that as "make stacks of gray cards." The better formulation is: restrained but not plain.

Then in frontmatter:

- `personality`: 3–6 adjectives (`utilitarian`, `editorial`, `dense`, `playful`, `restrained`, …)
- `resembles`: 1–3 well-known references (Linear, Geist, Material 3, …) — only if genuinely close

Notable absences ("no decorative elements at all", "no shadows anywhere despite a dark theme") are *not* prose to write here — they're candidate checks with `presence_floor: 0` (or a small integer), which causes any addition to land one perceptual tier louder when the check is promoted. Codifying absences as enforceable checks beats restating them in prose.

#### Positive range pass

Before writing decisions, list 3–7 ways the system permits variety inside its constraints. Good levers include:

- **Editorial scale contrast** — large/small type, dense chrome next to roomy reading surfaces.
- **Shaped composition** — article, tracker, comparison, canvas, or compact card layouts chosen by task.
- **Semantic/data color** — hue appears when it clarifies state, status, risk, ownership, or chart series.
- **Role-based elevation** — shadows or borders map to component roles, not arbitrary intensity.
- **Functional motion** — motion marks reveal, loading, state transition, or spatial continuity.
- **Local font sourcing and type ramp** — hosts bring the face, but the expression defines the rhythm.
- **Themeable tokens** — variation flows through semantic variables, not hardcoded monochrome.

Promote these levers into `# Character`, relevant decisions, or candidate checks when the survey supports them. This is the antidote to negative-space prompts that only say what to avoid.

### 4. Layer 2 — Checks (curated, grep-friendly, perceptual-prior-aware)

This is the load-bearing step. **Your job is to propose 5–15 candidate checks, score each by survey-derived support, and present the ranked list to the human curator.** The curator promotes the sharpest 5–10 to `checks[]`. Promoted checks are the primary drift contract: they need `support >= 0.85`, `observed_count` when calibrated from survey evidence, and an `enforce_at` context where the reviewer should look. You do not author final checks unilaterally — design taste is human-curated, agent-proposed.

Promotion boundary: `checks[]` is the promoted layer, not the scratchpad. If no curator has selected checks in this turn, leave `checks[]` empty and put the ranked candidate list in your final response or scan notes. The expression is still valid without checks; an unpromoted check is more dangerous than a missing check because it turns an agent guess into enforcement.

(Legacy: this stage previously authored `decisions[]` — abstract per-dimension prose. That format is preserved during the v0 transition for backward compatibility, but the canonical authoring surface is now `checks[]`. The emitter prefers `checks[]` when present.)

#### 4a. Propose candidate checks

Walk the survey and pose: *what pattern is this project consistently following that deserves codification?* Each candidate check has the shape:

```yaml
- id: <kebab-slug>          # stable, slug-style
  canonical: <dimension>     # optional but strongly preferred (see vocabulary below)
  kind: <CheckKind>           # optional; drives default match shape
  summary: <one line>        # what the check says in plain English
  rationale: <prose>         # why the check exists; cites the survey
  pattern: <regex or string> # what the reviewer greps for
  enforce_at: [...]          # className / css_var / inline_style / import
  support: 0.0–1.0           # computed: survey conformers / total observed
  observed_count: <int>      # count of the guarded pattern / survey slice
  presence_floor: <int>      # optional; default 0
```

**Pick `canonical` from the controlled vocabulary first.** Thirteen dimensions cover the orthogonal axes a designer makes deliberate calls on:

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
| `composition-patterns` | task-shaped composition; article/tracker/comparison/card response shapes; avoiding card-by-default collapse | structural |

The **default tier** is the perceptual weight: loud checks render as Critical, structural as Serious, rhythmic as Nit in the emitted reviewer. Severity is computed by the emitter from `canonical`, `observed_count`, and `presence_floor`; you don't usually set `severity` directly.

#### 4b. Score support from the survey

For each candidate check, compute support — *the fraction of observed cases that already conform* — and record `observed_count`, the denominator or survey slice the check was calibrated against. Concretely:

- **`no-off-palette-hex`** (color-strategy) — `support = (survey color rows with value in palette set) / (total survey color rows)`. If 31 of 33 colors are in the palette, support is 0.94.
- **`pill-interactives`** (shape-language) — `support = (interactive components using rounded-full) / (interactive components observed)`. Walk `survey.components` for Button/Input/Badge; check radii.
- **`spacing-on-scale`** (spatial-system) — `support = (spacing rows with value ∈ scale) / (total spacing rows)`. The scale lives in `expression.spacing.scale`.
- **`no-card-collapse`** (composition-patterns) — usually not grep-friendly enough for `checks[]`; keep it as a decision unless the repo has enforceable metadata or repeated examples proving cards are only one response shape.

Drop candidates with support < 0.85. Below that threshold, the project hasn't actually committed to the pattern — codifying it generates noise. A `support: 0.6` check looks aspirational, not enforced. If you still think a low-support candidate matters, put it in scan notes for discussion; do not promote it to `checks[]`.

#### 4c. Identify presence-floor candidates

The perceptual prior escalates promoted checks one tier when `observed_count` (or, if absent, the emitter's coarse survey proxy) is ≤ `presence_floor`. Use this to capture *negative space* — what the project deliberately *isn't*:

- Survey has 0 decorative-motion rows → `no-decorative-motion` check with `observed_count: 0` and `presence_floor: 4`.
- Survey has 0 gradient values → `no-gradients` with `observed_count: 0` and `presence_floor: 0`.
- Survey has 0 bundled fonts → `no-foreign-fonts` with `observed_count: 0` and `presence_floor: 0`.

Don't set a presence floor when the guarded pattern is well-populated — the escalation will never trigger and the field becomes noise. If the overall dimension is populated but a sub-pattern is absent (e.g. structural motion exists, decorative motion does not), set `observed_count` to the sub-pattern count and say that in the rationale.

#### 4d. Present the ranked list to the curator

Sort candidates by support, descending. Present each as: id + canonical + summary + support % + 1-line rationale. Mark presence-floor escalations explicitly. Recommend cuts: anything below 0.85, anything redundant with another check, anything where the pattern is too fuzzy to enforce.

The curator picks 5–10. **Do not paste your full candidate list into `checks[]`.** Wait for the human to promote, then copy only the selected checks into frontmatter with their `observed_count` and `support`.

#### Mode-specific framing

- **Consumer** — overrides are checks. App-side `@font-face` that differs from upstream → a `font-sourcing` check with `observed_count` set to the count of non-upstream font declarations and `presence_floor: 0`.
- **Token-pipeline** — layering posture is a check. "Component layer never references base tokens directly" → a `token-architecture` check whose pattern catches `--component-* references --base-*`.
- **Ui-library** — registry shape is a check. "Components have no theme variants" → an `interactive-patterns` check against `data-theme=` attributes. If the registry or docs tag exemplars, preserve the atom/shape distinction: atoms are primitives such as badge, button, cell, or input; shapes are larger response forms such as article, card, comparison, or tracker.
- **Multi-platform** — divergence is checks. "iOS reuses system colors but web doesn't" → two color-strategy checks, one per dialect, each with its own `enforce_at`.

#### Absences are checks — codify them with `presence_floor`

Don't try to express "this project has no animation" as prose. Express it as a motion check whose `observed_count` + `presence_floor` causes additions to land one perceptual tier louder. The emitted reviewer will catch the addition without the prose.

### 5. Layer 3 — Concrete tokens (read from survey; do not invent)

Populate the structured frontmatter fields **from survey rows**:

- `palette.dominant` — top color rows by `occurrences`, with role assigned. Use survey `role_hypothesis` when present and you agree; override when you don't. Cite the role.
- `palette.neutrals` — neutral-saturation color rows (low chroma — check the `spec.hsl.s` if present, or judge from the hex). `count` is the row count, `steps` is the literal hex array.
- `palette.semantic` — color rows whose `role_hypothesis` or naming suggests success/warning/error/info. Empty array if none.
- `palette.saturationProfile` — `muted` / `vibrant` / `mixed`. Judge from the chroma distribution of dominant colors.
- `palette.contrast` — `low` / `moderate` / `high`. Judge from neutrals' lightness range.
- `spacing.scale` — sorted distinct scalar values from `kind: spacing` rows. Convert rem/em to px (1rem = 16px) before recording.
- `spacing.baseUnit` — the GCD of scale entries, or the smallest scalar that divides most others.
- `spacing.regularity` — 1.0 if the scale is a clean modular sequence (4, 8, 16, 24, …), lower as it diverges.
- `typography.families` — distinct `family` values from `kind: typography` rows.
- `typography.sizeRamp` — distinct font sizes (in px) from `kind: typography` rows.
- `typography.weightDistribution` — map of weight → relative frequency from `kind: typography` rows.
- `typography.lineHeightPattern` — `tight` / `normal` / `loose` / `mixed`, judged from `line_height` values.
- `surfaces.borderRadii` — distinct scalars from `kind: radius` rows.
- `surfaces.shadowComplexity` — `deliberate-none` (zero shadow rows + you confirmed it's intentional), `subtle` (1–2 distinct shadow specs), `layered` (3+ or visibly tiered).
- `surfaces.borderUsage` — `minimal` / `moderate` / `heavy`, judged from how often borders appear in samples (the survey may not surface this directly — read 2–3 component files if in doubt).

**Hard rule:** every value you put in `palette` / `spacing` / `typography` / `surfaces` must trace to a row in `survey.json`. If it isn't in the survey, it isn't in the expression. A missing field beats a fabricated one. If the survey is sparse for a dimension (e.g. only one shadow), reflect that — `shadowComplexity: subtle` with one shadow is honest; making up a layered system is a lie.

**Hard rule:** every `palette` entry must be cited in at least one decision's `evidence`, or dropped. Uncited tokens are noise.

### 6. Write the file

Copy [../assets/expression.template.md](../assets/expression.template.md). Fill in:

- **Frontmatter:** all structured fields (identity, `references`, `observation.personality`/`.resembles`, `decisions[].dimension`, optional `checks[]`, `palette`, `spacing`, `typography`, `surfaces`).
- **Body:** `# Character` (observation summary), `# Signature` (final-picture posture), `# Decisions` (one `### <dim>` block per decision, each ending with `**Evidence:**` bullets citing survey rows).

Partition matters. See [schema.md](schema.md) for which field lives where.

If the target will be used for AI-generated outputs, include a `composition-patterns` decision when supported by examples, registry metadata, docs, or repeated component usage. Name the response shapes the language supports:

- **article** — plans, timelines, worksheets, narrative/canvas outputs, and long-form synthesized answers.
- **tracker** — metrics, progress, runway, review queues, audit status, and recurring operational views.
- **comparison** — tradeoffs, allocation, option sets, before/after states, and side-by-side decisions.
- **card** — compact focused recommendations or repeated peer items; card is one shape, not the default form of all intelligence.

Composition anti-collapse check: do not turn every answer into a stack of cards. Let the user's task determine whether the output is a plan, tracker, comparison table, control surface, article, or compact recommendation. For freeform generation, infer a narrow intent/shape slice before selecting examples and style directions.

### 7. Validate

**Preferred (CLI present):**

    ghost-expression lint expression.md

Fix any errors.

**Prose fallback (no CLI):**

Walk the file against the schema in [schema.md](schema.md). Required checks:

- Frontmatter parses as valid YAML.
- Required fields: `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`.
- Body sections appear in order: `# Character`, `# Signature`, `# Decisions` (when decisions are present). No prose in frontmatter.
- For any `### dim` block in the body, a matching `decisions[].dimension` entry exists in frontmatter (and vice versa).
- For any `checks[]` entry: `id` is unique, `pattern` is non-empty, `support` is present and preferably ≥ `0.85`, `enforce_at` is present where possible, optional `severity` ∈ `{critical, serious, nit}`, optional `match` ∈ `{exact, band, percent, structural}`, optional `observed_count` is a non-negative integer.
- If `presence_floor` is set, `observed_count` should also be set; otherwise absence escalation falls back to coarse frontmatter proxies.

Common errors regardless of path:

- Prose in frontmatter → move to body.
- `### dim` with no matching `decisions[]` entry → remove the orphan.
- Palette entry not cited in any evidence → cite it (from a survey row) or drop it.
- Typography size not in the survey → drop it; the surveyor missed it or it's not real.

### 8. Provenance check

For every value in your expression's frontmatter, confirm it appears in `survey.json`. Quick sanity:

    jq -r '.values[] | select(.kind=="color") | .value' survey.json | sort -u
    # compare against your palette entries

Any expression value that doesn't trace back is a hallucination. Remove it.

### 9. Self-distance sanity

**Preferred (CLI present):**

    ghost-drift compare expression.md expression.md

Self-distance must be 0. Anything else means the file isn't deterministically loadable.

**Prose fallback (no CLI / no ghost-drift):**

Re-load the file mentally: parse the frontmatter, normalize whitespace in the body, then verify the file would round-trip through a YAML parser without info loss. If you can't be sure, run the CLI (it's the calculator that exists for exactly this question). The self-distance check is genuinely a "machine math" answer — prose verification is best-effort, not authoritative.

## When the survey is incomplete

If the surveyor's `survey.json` has known gaps (a `# Coverage` note in the survey scratchpad, unresolved external symbols, or thin coverage for a dialect), surface them in the expression's `# Character` body or as a Decision (e.g. `### scan-coverage` with evidence "iOS dialect under-sampled — only 23 color sites recorded; 14 color symbols unresolved through arcade-ios-package; web dialect is the dominant signal in this expression"). Do not paper over gaps with invented values.

## When you cannot profile

If `survey.json` is empty (a backend-only repo, no UI) and `map.md` confirms no design system, say so in `# Character` and emit a minimal expression with empty palette/spacing/typography/surfaces. Do not fabricate. A placeholder expression poisons every downstream comparison.
