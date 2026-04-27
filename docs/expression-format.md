# The `expression.md` format

A Ghost **expression** is a single Markdown file that captures what a design language is trying to say — readable and editable by humans, natively consumable by LLMs, with a structured machine layer for `ghost-drift compare`, `ghost-expression lint`, and the skill recipes the host agent runs (profile, review, verify, generate).

The file has two parts, and each owns **different data**:

1. **Frontmatter (YAML)** — the **machine layer**. Identity, tokens, dimension slugs (without rationale or evidence), personality/resembles tags, optional cached embedding. Validated by zod. Read by deterministic tools.
2. **Body (Markdown)** — the **prose layer**. Character paragraph, Signature bullets, Decision rationale, **Evidence bullets**. Read by humans and LLMs.

Each field lives in exactly one place. There is no precedence rule because there is nothing to conflict over.

Canonical filename: `expression.md` (flat, no dotfile, no slug prefix). Zero-config default for every Ghost command that reads an expression.

Current schema generation: **5**.

Schema 5 moved decision evidence from frontmatter into the body — each `### dimension` block now carries its rationale prose followed by an optional `**Evidence:**` bullet list. Schema 4's frontmatter `decisions[].evidence` is no longer accepted (`.strict()` rejects it).

Schema 5 also keeps schema 4's two prior moves: the 49-dimensional `embedding` is extracted into a sibling `embedding.md` fragment, and a loose `metadata:` bag carries LLM-authored extensions. The fragment pattern mirrors [agent skills](https://agentskills.io/): a thin index file references sibling fragments via ordinary markdown links.

The frontmatter schema is **not** versioned via a `schema:` field — `FrontmatterSchema` is `.strict()` and rejects any `schema:` key. Identity is provided by `id`, and the parser/writer encode the current generation implicitly.

---

## The partition (the one rule)

The frontmatter and the body own disjoint fields. The reader unions them into a single in-memory Expression.

| Expression field | Lives in | Section / key |
|---|---|---|
| `id`, `source`, `timestamp`, `sources` | Frontmatter | top-level |
| `observation.personality`, `observation.resembles` | Frontmatter | `observation:` |
| `observation.summary` | **Body** | `# Character` |
| `observation.distinctiveTraits` | **Body** | `# Signature` bullets |
| `decisions[].dimension`, `decisions[].embedding` | Frontmatter | `decisions:` entry |
| `decisions[].decision` (prose rationale) | **Body** | `### dimension` block |
| `decisions[].evidence` | **Body** | `**Evidence:**` bullet list under `### dimension` |
| `palette`, `spacing`, `typography`, `surfaces` | Frontmatter | top-level |
| `roles[]` (slot → token bindings) | Frontmatter | `roles:` |
| `embedding` (49-dim vector) | **Sibling file** | `embedding.md` (referenced from `# Fragments`) |
| `metadata` (loose extension bag) | Frontmatter | top-level, open-ended |

The zod schema is `.strict()` on structural blocks and on `decisions[]` — putting prose fields (summary, decision rationale, evidence) in YAML is a validation error. The writer enforces the other direction: serialization puts prose and evidence only in the body. The `metadata:` bag is the one escape hatch: a loose `Record<string, unknown>` for LLM-authored extensions (e.g. `tone: magazine`) that don't fit the strict blocks. It's opaque to comparisons — never feeds the embedding.

Earlier generations mirrored narrative fields across both sides and picked a winner — the source of every "did my edit count?" confusion. Generation 3 removed the duplication. Generation 4 extracted the embedding into a sibling fragment. Generation 5 — the current one — moves decision evidence into the body so the YAML stays purely structural and rationale + citations stay together where a reader can inspect both.

---

## Frontmatter schema

Validated by a zod schema (`packages/ghost-expression/src/core/schema.ts`) and published as JSON Schema at `schemas/expression.schema.json`. Below is the shape:

```yaml
---
# --- meta ---
name: Claude                      # display name
slug: claude                      # kebab-case id
generator: ghost@0.9.0            # tool + version that produced this file
generated: 2026-04-18T00:00:00Z   # ISO-8601 (alias for `timestamp`)
confidence: 0.87                  # 0–1, overall inference confidence (optional)
extends: ./base.expression.md     # optional — inherit from a base expression (see Composition)
metadata:                          # optional — loose extension bag
  tone: magazine
  era: 2020s-editorial

# --- expression: identity ---
id: claude
source: llm                       # registry | extraction | llm | unknown
timestamp: 2026-04-18T00:00:00Z
sources:                          # optional, lists the targets that were combined
  - github:anthropics/claude-code
  - https://claude.ai

# --- expression: narrative tags ---
# NOTE: prose (summary, distinctiveTraits, decision rationale) and the
# `**Evidence:**` bullets per decision live in the body under
# # Character, # Signature, ### blocks.
observation:
  personality: [restrained, editorial]
  resembles: [notion, linear]

# Decisions in the YAML are skeletons — dimension slug + optional embedding.
# Rationale and evidence live in the body under matching `### dimension`
# blocks. `evidence:` here is a strict-schema violation.
decisions:
  - dimension: warm-only-neutrals
  - dimension: serif-headlines

# --- expression: structured tokens ---
palette:
  dominant:
    - { role: accent, value: '#c96442' }
    - { role: surface, value: '#f5f4ed' }
  neutrals:
    steps: ['#faf9f5', '#e8e6dc', '#87867f', '#5e5d59', '#4d4c48', '#141413']
    count: 6
  semantic:
    - { role: error, value: '#b53333' }
    - { role: focus, value: '#3898ec' }
  saturationProfile: muted          # muted | vibrant | mixed
  contrast: moderate                # high | moderate | low

typography:
  families: ['Anthropic Serif', 'Anthropic Sans', 'Anthropic Mono']
  sizeRamp: [12, 14, 15, 16, 17, 20, 25.6, 32, 52, 64]
  weightDistribution: { 400: 0.6, 500: 0.4 }
  lineHeightPattern: loose          # tight | normal | loose

spacing:
  scale: [4, 8, 12, 16, 24, 32]
  baseUnit: 8                       # null if no coherent base
  regularity: 0.85                  # 0–1

surfaces:
  borderRadii: [8, 12, 16, 32]
  shadowComplexity: subtle          # deliberate-none | subtle | layered
  borderUsage: moderate             # minimal | moderate | heavy

# --- expression: role bindings (optional) ---
# Semantic slot → token bindings. Bridges abstract tokens to rendering:
# a role names a slot (h1, card, button, …) and binds specific tokens
# from the dimensions above. Each sub-block is optional; omit what you
# cannot infer from source. Agents populate these from component files.
roles:
  - name: h1
    tokens:
      typography: { family: Anthropic Serif, size: 52, weight: 500 }
      spacing: { margin: 32 }
    evidence: ["components/Heading.tsx:12"]
  - name: card
    tokens:
      surfaces: { borderRadius: 16, shadow: subtle }
      spacing: { padding: 24 }
      palette: { background: '#f5f4ed' }
    evidence: ["components/ui/card.tsx"]

# --- expression: vector layer ---
# embedding is OPTIONAL at root. Readers load it from the sibling
# `embedding.md` fragment (referenced in the body) or recompute from the
# structural blocks above. Omitting it keeps this file lean.
---
```

**Required:** `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`.
**Optional:** `embedding` (omit to let readers load from `embedding.md` or recompute), `metadata` (loose key-value extension bag).
**Optional narrative tags:** `observation.personality`, `observation.resembles`, `decisions[]`. Omit rather than lie — a missing tag is truer than a fabricated one.
**Optional role bindings:** `roles[]`. Each role requires `name` and `evidence[]` (citations for where the binding was observed); token sub-blocks (`typography`, `spacing`, `surfaces`, `palette`) are independently optional and strict — unknown keys reject. Note: `evidence` belongs *inside* role entries, not on `decisions[]`.
**Optional meta:** `name`, `slug`, `generator`, `confidence`, `generated`, `sources`, `extends`.
**Forbidden in frontmatter:** `observation.summary`, `observation.distinctiveTraits`, `decisions[].decision`, `decisions[].evidence`, and any unknown root key (e.g. `schema:`). These either live in the body (prose / evidence) or are not part of the schema.

When `extends:` is present, required expression fields may be omitted — the overlay inherits them from the base expression. The merged result is re-validated against the strict schema.

---

## Body

The body owns prose and evidence. Four section kinds, all optional, in this order:

```markdown
# Character

A literary salon reimagined as a product page — warm, unhurried.

# Signature

- Warm ring-shadows instead of drop-shadows
- Editorial serif/sans split

# Decisions

### warm-only-neutrals

Every gray carries a yellow-brown undertone. No cool blue-grays.

**Evidence:**
- `#5e5d59`
- `#87867f`
- `#4d4c48`

### serif-headlines

All headlines use Serif 500. UI uses Sans 400–500.

**Evidence:**
- `H1-H6 serif 500 (src/styles/headings.css:14)`
```

The parser matches `### dimension` blocks to frontmatter `decisions[].dimension` by slug. A body block without a frontmatter entry is appended to the decisions list (and flagged `orphan-prose` by `ghost-expression lint`). A frontmatter entry without a body block carries empty rationale (flagged `missing-rationale`).

**Evidence lives in the body.** Each `### dimension` block may end with a `**Evidence:**` bullet list — concrete citations (token names, hex values, `file:line` references) that ground the rationale. The parser pulls those bullets back onto `decisions[].evidence` in memory, but on disk they belong to the body. Putting `evidence:` on a `decisions[]` entry in YAML is a strict-schema violation.

### `# Fragments` section

The body may also carry a `# Fragments` section that lists sibling files by markdown link:

```markdown
# Fragments

- [embedding](embedding.md) — 49-dim vector for compare/composite/viz
```

Readers walk these links to progressively load sibling content. The current v4 writer always emits a link to `embedding.md` when the expression carries an embedding (see [Embedding fragment](#embedding-fragment)). Future fragment types (palette, typography, motion, …) follow the same pattern: an entry in `# Fragments`, an own-validated file next to `expression.md`.

Link rules:

- Only `.md` targets count as fragments.
- Absolute URLs (`http://…`) and anchors (`#foo`) are ignored.
- Paths are resolved relative to the expression.md directory.
- One level deep — avoid nested chains.

---

## Roles — the slot → token bridge

Tokens alone are ingredients: "sizes 14, 16, 20, 32, 64 exist." A role is a recipe: "`h1` uses size 64, weight 500." `roles[]` is the layer that names which tokens belong to which semantic slot, so the expression stops being an inventory and becomes something a renderer can act on.

**Shape.** Each role has three parts:

- `name` — the slot. Prefer HTML-like or archetype names: `h1`, `h2`, `body`, `caption`, `card`, `button`, `input`, `list-row`.
- `tokens` — the bindings, grouped by dimension. Each sub-block (`typography`, `spacing`, `surfaces`, `palette`) is independently optional and every field inside is optional. A role can be partial when the source only supplies some tokens.
- `evidence` — where the binding was observed. File paths or `path:line` references.

**Authoring contract.** Only emit roles with direct source evidence. A plausible-but-unobserved role is worse than a missing one. A codebase with no component files may produce no roles at all — that is truthful.

**Strictness.** The `typography`, `spacing`, and `surfaces` sub-blocks are zod `.strict()` — unknown keys reject, so the schema stays disciplined as it grows. The `palette` sub-block is an open record (Phase 5b widening): slot keys are free-form so consumers can name slots from the conventional vocabulary or extend it.

### Palette slot vocabulary

`roles[].tokens.palette` is a `Record<string, string>`. The recipe should reach for the conventional keys first; add others when they're load-bearing in the codebase.

**Conventional keys** (use these by default): `background`, `foreground`, `surface`, `border`, `accent`, `muted`, `link`.

**Extensions** seen in the wild: `ring`, `popover`, `separator`, `input`, `chart-1`, … — fine to use when the codebase justifies them.

### Token references

Role palette slot values may be raw hex literals OR token references. The reference syntax is `{<namespace>.<role>}`:

```yaml
roles:
  - name: button
    tokens:
      palette:
        background: '{palette.dominant.accent}'   # resolves to #c96442
        foreground: '{palette.dominant.surface}'  # resolves to #f5f4ed
        border:     '#e8e6dc'                     # raw hex is fine too
        ring:       '{base.color.brand.x.light}'  # opaque external ref
    evidence: ["components/ui/button.tsx:18"]
```

**Local namespaces:** `palette.dominant` and `palette.semantic` — the two palette blocks that already carry a `role`. Renames cascade (change the role value in one place, every role that references it updates too), and `ghost-expression lint` reports `broken-role-reference` for references that don't resolve.

**External / pipeline refs.** Token-pipeline consumers (Style Dictionary, Theo, …) often bind a role to a deeply-nested upstream token like `{base.color.brand.x.light}`. The linter accepts these as opaque passthroughs when the head segment is a recognized external namespace (`base`, `core`, `semantic`, `component`, `tokens`, `ref`, `sys`) or the path has 4+ segments. We don't try to resolve them — that requires walking the upstream package, which is out of scope for the deterministic CLI.

**What cannot be referenced locally.** `palette.neutrals.steps` is positional (no name). Typography, spacing, and surfaces are inventories, not named vocabularies — role tokens for those dimensions inline raw values. Local refs targeting the `palette.*` namespace beyond `dominant`/`semantic` fire `broken-role-reference`; external refs (heads outside `palette.*`) pass through.

---

## Embedding fragment

The 49-dimensional embedding lives in `embedding.md` next to the expression. The file carries only YAML — no prose:

```markdown
---
kind: embedding
of: claude               # expression id
dimensions: 49
vector:
  - 0.218
  - 0
  - 0.249
  # …47 more floats…
---
```

**Loader resolution order:**

1. Inline `embedding:` in the root frontmatter (trusted as cache).
2. Body link to `embedding.md` (or other `.md` link matching `embedding.md`).
3. Conventional sibling `embedding.md` next to `expression.md`.
4. Recompute from the structural blocks via `computeEmbedding`.

Missing or stale files are never fatal — the loader silently falls back to recompute. Skip backfill entirely with `loadExpression(path, { noEmbeddingBackfill: true })`.

The writer emits the sibling automatically when `serializeExpression(fp)` is called with `extractEmbedding: true` (default). Set `extractEmbedding: false` to keep the vector inline — useful for in-memory round-trips where no sibling is written.

---

## Composition (`extends:`)

An overlay expression can inherit from a base expression:

```yaml
---
extends: ./base.expression.md
id: product-expression
decisions:
  - dimension: warm-neutrals
---

# Decisions

### warm-neutrals

Now we also forbid warm grays.

**Evidence:**
- `#3a3630`
```

**Merge rules** (see `packages/ghost-expression/src/core/compose.ts`):

- **Scalars / arrays:** overlay replaces base when present.
- **`decisions[]`:** merged by `dimension` — overlay wins per-dim; base-only decisions preserved.
- **`palette.dominant` / `palette.semantic`:** merged by `role` — overlay wins per-role.

Cycles throw. Chains are resolved depth-first. After resolution, `extends:` is stripped from the returned meta.

Skip resolution: `loadExpression(path, { noExtends: true })`.

---

## Decision fragments

Large systems can split decisions across files. If a `decisions/` directory sits next to the expression.md, each `*.md` inside is read as a single decision and merged in by dimension:

```
my-system/
├── expression.md
└── decisions/
    ├── warm-neutrals.md
    ├── serif-headlines.md
    └── ring-shadows.md
```

Fragment format (evidence lives in the fragment's own frontmatter; prose is the body):

```markdown
---
dimension: warm-neutrals          # optional — falls back to filename stem
evidence: ['#5e5d59', '#87867f']  # optional
---

Every gray carries a yellow-brown undertone. No cool blue-grays exist anywhere.
```

Fragments override inline decisions with the same dimension. Skip with `loadExpression(path, { noFragments: true })`.

---

## Validation

`parseExpression` runs zod strict validation on every read (unless `skipValidation: true`). Structural errors (including unknown keys like `summary:` in YAML, or `evidence:` on a `decisions[]` entry) are collected and surfaced with field paths:

   ```
   Invalid expression frontmatter:
     • observation: Unrecognized keys: "summary", "distinctiveTraits"
     • decisions.0: Unrecognized keys: "decision", "evidence"
     • palette.saturationProfile: Invalid enum value...
   ```

For tooling that wants to inspect partial or in-progress files, `skipValidation` bypasses validation entirely.

---

## Tooling surface

| Command | Does |
|---|---|
| `profile` recipe (host agent) | Write `expression.md` (frontmatter machine-facts + body prose + body evidence); the agent ends by calling `ghost-expression lint` |
| `ghost-expression lint [path]` | Check schema validity, orphan prose, missing rationale, broken palette citations |
| `ghost-drift compare <a> <b> --semantic` | Semantic diff: decisions added/removed/modified, value deltas, palette role swaps, token changes |
| `ghost-drift compare <a> <b>` | Vector distance (quantitative — use `--semantic` for qualitative) |
| `ghost-expression emit context-bundle` | Emit a grounding skill bundle (`SKILL.md` + `expression.md` + `tokens.css`) |
| `ghost-expression emit review-command` | Emit a per-project drift-review slash command (`.claude/commands/design-review.md`) |
| `ghost-drift emit skill` | Install the `ghost-drift` skill bundle into your host agent |

Programmatic API (`ghost-expression`): `loadExpression`, `parseExpression`, `serializeExpression`, `lintExpression`, `mergeExpression`, `loadDecisionFragments`, `loadEmbeddingFragment`, `serializeEmbeddingFragment`, `findFragmentLinks`, `resolveEmbeddingReference`, `FrontmatterSchema`, `toJsonSchema`. Comparison lives in `ghost-drift`: `compareExpressions`.

---

## What's deliberately excluded

- **Duplication.** A field cannot live in both places. Trying to put prose in YAML is a validation error; the writer never emits prose there.
- **Implementation-specific tokens.** No framework names, no CSS-in-JS specifics, no component library assumptions. Decisions are abstract ("warm-only neutrals"), not concrete ("`neutral-50` in `tailwind.config.js`").
- **Confidence theatre.** If the generator isn't sure, omit `confidence` or set `source: unknown`. Fabricated `1.0` is worse than missing.
- **Schema migration.** Older generations (with frontmatter `decisions[].evidence`, body-mirrored prose, or a `schema:` root key) are rejected by `.strict()` validation. Regenerate by running the `profile` recipe in your host agent.
- **Token references into typography / spacing / surfaces.** Those blocks are positional inventories (`sizeRamp`, `scale`, `borderRadii`) with no named slots to point at. Role tokens for those dimensions inline raw values; referencing them triggers `broken-role-reference`.

---

## JSON Schema

`schemas/expression.schema.json` is regenerated from the zod source in `packages/ghost-expression/src/core/schema.ts`:

```bash
pnpm --filter ghost-expression build && node scripts/emit-expression-schema.mjs
```

Point your editor at it via a comment or `yaml.schemas` config for autocomplete in the frontmatter.
