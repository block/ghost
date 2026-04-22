# The `fingerprint.md` format

A Ghost **fingerprint** is a single Markdown file that captures what a design language is trying to say — readable and editable by humans, natively consumable by LLMs, with a structured machine layer for `ghost-drift compare`, `ghost-drift lint`, and the skill recipes the host agent runs (profile, review, verify, generate).

The file has two parts, and each owns **different data**:

1. **Frontmatter (YAML)** — the **machine layer**. Identity, tokens, dimension slugs, evidence, personality/closestSystems tags, embedding. Validated by zod. Read by deterministic tools.
2. **Body (Markdown)** — the **prose layer**. Character paragraph, Signature bullets, Decision rationale. Read by humans and LLMs.

Each field lives in exactly one place. There is no precedence rule because there is nothing to conflict over.

Canonical filename: `fingerprint.md` (flat, no dotfile, no slug prefix). Zero-config default for every Ghost command that reads a fingerprint.

Current schema version: **4**.

Schema 4 extracts the 49-dimensional `embedding` into a sibling `embedding.md` fragment and adds a loose `metadata:` bag for LLM-authored extensions. The pattern mirrors [agent skills](https://agentskills.io/): a thin index file references sibling fragments via ordinary markdown links.

---

## The partition (the one rule)

The frontmatter and the body own disjoint fields. The reader unions them into a single in-memory Fingerprint.

| Fingerprint field | Lives in | Section / key |
|---|---|---|
| `id`, `source`, `timestamp`, `sources` | Frontmatter | top-level |
| `observation.personality`, `observation.closestSystems` | Frontmatter | `observation:` |
| `observation.summary` | **Body** | `# Character` |
| `observation.distinctiveTraits` | **Body** | `# Signature` bullets |
| `decisions[].dimension`, `decisions[].evidence`, `decisions[].embedding` | Frontmatter | `decisions:` entry |
| `decisions[].decision` (prose rationale) | **Body** | `### dimension` block |
| `palette`, `spacing`, `typography`, `surfaces` | Frontmatter | top-level |
| `roles[]` (slot → token bindings) | Frontmatter | `roles:` |
| `embedding` (49-dim vector) | **Sibling file** | `embedding.md` (referenced from `# Fragments`) |
| `metadata` (loose extension bag) | Frontmatter | top-level, open-ended |

The zod schema is `.strict()` on structural blocks — putting prose fields (summary, decision rationale) in YAML is a validation error. The writer enforces the other direction: serialization puts prose only in the body. The `metadata:` bag is the one escape hatch: a loose `Record<string, unknown>` for LLM-authored extensions (e.g. `tone: magazine`) that don't fit the strict blocks. It's opaque to comparisons — never feeds the embedding.

Schema 1 and 2 tried to mirror narrative fields across both sides and pick a winner. That split was the source of every "did my edit count?" confusion. Schema 3 removed the duplication. Schema 4 then extracts the embedding into a sibling fragment so the index stays thin and agents can progressively disclose context (cheap metadata first, vector on demand).

---

## Frontmatter schema

Validated by a zod schema (`packages/ghost-drift/src/core/fingerprint/schema.ts`) and published as JSON Schema at `schemas/fingerprint.schema.json`. Below is the shape:

```yaml
---
# --- meta ---
name: Claude                      # display name
slug: claude                      # kebab-case id
schema: 4                         # format version — required, rejected on mismatch
generator: ghost@0.9.0            # tool + version that produced this file
generated: 2026-04-18T00:00:00Z   # ISO-8601 (alias for `timestamp`)
confidence: 0.87                  # 0–1, overall inference confidence (optional)
extends: ./parent.fingerprint.md   # optional — inherit from a parent (see Composition)
metadata:                          # optional — loose extension bag
  tone: magazine
  era: 2020s-editorial

# --- fingerprint: identity ---
id: claude
source: llm                       # registry | extraction | llm | unknown
timestamp: 2026-04-18T00:00:00Z
sources:                          # optional, lists the targets that were combined
  - github:anthropics/claude-code
  - https://claude.ai

# --- fingerprint: narrative tags ---
# NOTE: prose (summary, distinctiveTraits, decision rationale) lives
# in the body under # Character, # Signature, ### blocks.
observation:
  personality: [restrained, editorial]
  closestSystems: [notion, linear]

decisions:
  - dimension: warm-only-neutrals
    evidence: ["#5e5d59", "#87867f", "#4d4c48"]
  - dimension: serif-headlines
    evidence: ["H1-H6 serif 500"]

# --- fingerprint: structured tokens ---
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
  shadowComplexity: subtle          # none | subtle | layered
  borderUsage: moderate             # minimal | moderate | heavy

# --- fingerprint: role bindings (optional) ---
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

# --- fingerprint: vector layer ---
# embedding is OPTIONAL at root in v4. Readers load it from the sibling
# `embedding.md` fragment (referenced in the body) or recompute from the
# structural blocks above. Omitting it keeps this file lean.
---
```

**Required:** `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`.
**Required-but-conditional:** `schema` (if present, must equal 4). Missing `schema:` is warned but accepted.
**Optional:** `embedding` (omit to let readers load from `embedding.md` or recompute), `metadata` (loose key-value extension bag).
**Optional narrative tags:** `observation.personality`, `observation.closestSystems`, `decisions[]`. Omit rather than lie — a missing tag is truer than a fabricated one.
**Optional role bindings:** `roles[]`. Each role requires `name` and `evidence[]`; token sub-blocks (`typography`, `spacing`, `surfaces`, `palette`) are independently optional and strict — unknown keys reject.
**Optional meta:** `name`, `slug`, `generator`, `confidence`, `generated`, `sources`, `extends`.
**Forbidden in frontmatter:** `observation.summary`, `observation.distinctiveTraits`, `decisions[].decision`. These live in the body.

When `extends:` is present, required fingerprint fields may be omitted — the child inherits them from the parent. The merged result is re-validated against the strict schema.

---

## Body

The body owns prose. Four section kinds, all optional, in this order:

```markdown
# Character

A literary salon reimagined as a product page — warm, unhurried.

# Signature

- Warm ring-shadows instead of drop-shadows
- Editorial serif/sans split

# Decisions

### warm-only-neutrals
Every gray carries a yellow-brown undertone. No cool blue-grays.

### serif-headlines
All headlines use Serif 500. UI uses Sans 400–500.
```

The parser matches `### dimension` blocks to frontmatter `decisions[].dimension` by slug. A body block without a frontmatter entry is appended to the decisions list with empty evidence (and flagged `orphan-prose` by `ghost-drift lint`). A frontmatter entry without a body block carries empty rationale (flagged `missing-rationale`).

**Evidence does not appear in the body.** It lives in the frontmatter under `decisions[].evidence`. Legacy `**Evidence:**` bullets from schema 2 files are flagged by `ghost-drift lint` as `stray-evidence-in-body`.

### `# Fragments` section

The body may also carry a `# Fragments` section that lists sibling files by markdown link:

```markdown
# Fragments

- [embedding](embedding.md) — 49-dim vector for compare/composite/viz
```

Readers walk these links to progressively load sibling content. The current v4 writer always emits a link to `embedding.md` when the fingerprint carries an embedding (see [Embedding fragment](#embedding-fragment)). Future fragment types (palette, typography, motion, …) follow the same pattern: an entry in `# Fragments`, an own-validated file next to `fingerprint.md`.

Link rules:

- Only `.md` targets count as fragments.
- Absolute URLs (`http://…`) and anchors (`#foo`) are ignored.
- Paths are resolved relative to the fingerprint.md directory.
- One level deep — avoid nested chains.

---

## Roles — the slot → token bridge

Tokens alone are ingredients: "sizes 14, 16, 20, 32, 64 exist." A role is a recipe: "`h1` uses size 64, weight 500." `roles[]` is the layer that names which tokens belong to which semantic slot, so the fingerprint stops being an inventory and becomes something a renderer can act on.

**Shape.** Each role has three parts:

- `name` — the slot. Prefer HTML-like or archetype names: `h1`, `h2`, `body`, `caption`, `card`, `button`, `input`, `list-row`.
- `tokens` — the bindings, grouped by dimension. Each sub-block (`typography`, `spacing`, `surfaces`, `palette`) is independently optional and every field inside is optional. A role can be partial when the source only supplies some tokens.
- `evidence` — where the binding was observed. File paths or `path:line` references.

**Authoring contract.** Only emit roles with direct source evidence. A plausible-but-unobserved role is worse than a missing one. A codebase with no component files may produce no roles at all — that is truthful.

**Strictness.** The `tokens` sub-blocks are zod `.strict()` — unknown keys reject, so the schema stays disciplined as it grows. Add a field to the schema before emitting it.

---

## Embedding fragment

Schema 4 extracts the 49-dimensional embedding into `embedding.md` next to the fingerprint. The file carries only YAML — no prose:

```markdown
---
schema: 4
kind: embedding
of: claude               # parent fingerprint id
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
3. Conventional sibling `embedding.md` next to `fingerprint.md`.
4. Recompute from the structural blocks via `computeEmbedding`.

Missing or stale files are never fatal — the loader silently falls back to recompute. Skip backfill entirely with `loadFingerprint(path, { noEmbeddingBackfill: true })`.

The writer emits the sibling automatically when `serializeFingerprint(fp)` is called with `extractEmbedding: true` (default). Set `extractEmbedding: false` to keep the vector inline — useful for in-memory round-trips where no sibling is written.

---

## Composition (`extends:`)

A child fingerprint can inherit from a parent:

```yaml
---
schema: 4
extends: ./parent.fingerprint.md
id: child-system
decisions:
  - dimension: warm-neutrals
    evidence: ["#3a3630"]
---

# Decisions

### warm-neutrals
Now we also forbid warm grays.
```

**Merge rules** (see `packages/ghost-drift/src/core/fingerprint/compose.ts`):

- **Scalars / arrays:** child replaces parent when present.
- **`decisions[]`:** merged by `dimension` — child wins per-dim; parent-only decisions preserved.
- **`palette.dominant` / `palette.semantic`:** merged by `role` — child wins per-role.

Cycles throw. Chains are resolved depth-first. After resolution, `extends:` is stripped from the returned meta.

Skip resolution: `loadFingerprint(path, { noExtends: true })`.

---

## Decision fragments

Large systems can split decisions across files. If a `decisions/` directory sits next to the fingerprint.md, each `*.md` inside is read as a single decision and merged in by dimension:

```
my-system/
├── fingerprint.md
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

Fragments override inline decisions with the same dimension. Skip with `loadFingerprint(path, { noFragments: true })`.

---

## Validation

`parseFingerprint` runs two gates on every read (unless `skipValidation: true`):

1. **Schema version gate.** `schema:` must equal 4. Stale files throw with a regenerate hint.
2. **Zod strict validation.** Structural errors (including unknown keys like `summary:` in YAML) are collected and surfaced with field paths:

   ```
   Invalid fingerprint frontmatter:
     • observation: Unrecognized keys: "summary", "distinctiveTraits"
     • decisions.0: Unrecognized key: "decision"
     • palette.saturationProfile: Invalid enum value...
   ```

For tooling that wants to inspect partial or in-progress files, `skipValidation` bypasses both gates.

---

## Tooling surface

| Command | Does |
|---|---|
| `profile` recipe (host agent) | Write `fingerprint.md` (frontmatter machine-facts + body prose); the agent ends by calling `ghost-drift lint` |
| `ghost-drift lint [path]` | Check schema validity, orphan prose, missing rationale, stray evidence in body, broken palette citations |
| `ghost-drift compare <a> <b> --semantic` | Semantic diff: decisions added/removed/modified, value deltas, palette role swaps, token changes |
| `ghost-drift compare <a> <b>` | Vector distance (quantitative — use `--semantic` for qualitative) |
| `ghost-drift emit context-bundle` | Emit a grounding skill bundle (`SKILL.md` + `fingerprint.md` + `tokens.css`) |
| `ghost-drift emit review-command` | Emit a per-project drift-review slash command (`.claude/commands/design-review.md`) |
| `ghost-drift emit skill` | Install the `ghost-drift` skill bundle into your host agent |

Programmatic API (`ghost-drift`): `loadFingerprint`, `parseFingerprint`, `serializeFingerprint`, `lintFingerprint`, `compareFingerprints`, `mergeExpression`, `loadDecisionFragments`, `loadEmbeddingFragment`, `serializeEmbeddingFragment`, `findFragmentLinks`, `resolveEmbeddingReference`, `FrontmatterSchema`, `toJsonSchema`.

---

## What's deliberately excluded

- **Duplication.** A field cannot live in both places. Trying to put prose in YAML is a validation error; the writer never emits prose there.
- **Implementation-specific tokens.** No framework names, no CSS-in-JS specifics, no component library assumptions. Decisions are abstract ("warm-only neutrals"), not concrete ("`neutral-50` in `tailwind.config.js`").
- **Confidence theatre.** If the generator isn't sure, omit `confidence` or set `source: unknown`. Fabricated `1.0` is worse than missing.
- **Schema migration.** Schema 1, 2, and 3 files are rejected outright. Regenerate by running the `profile` recipe in your host agent.

---

## JSON Schema

`schemas/fingerprint.schema.json` is regenerated from the zod source:

```bash
pnpm --filter ghost-drift build && node scripts/emit-fingerprint-schema.mjs
```

Point your editor at it via a comment or `yaml.schemas` config for autocomplete in the frontmatter.
