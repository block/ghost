# expression.md schema reference

Canonical filename: `expression.md`.

Companion file: `embedding.md` (sibling fragment containing the 49-dim vector). The CLI writes it automatically when you write an `expression.md` via `ghost-drift`; you can also compute and append it yourself.

## Frontmatter (machine layer)

```yaml
---
# identity
id: my-project                  # required, slug-like
# (no schema version field — the format is unversioned for now)
source: llm                     # registry | extraction | llm | unknown
timestamp: 2026-04-20T00:00:00Z # ISO-8601
sources:                        # optional — targets that were combined
  - github:owner/repo
  - ./local/path
references:
  specs: [src/styles/tokens.css, src/theme/index.ts]
  components: [src/components/ui]
  examples: [docs/examples/dashboard.md]

# narrative tags (prose lives in the body)
observation:
  personality: [restrained, editorial]   # 3-6 adjectives
  resembles: [linear, notion]       # 1-3 known references this resembles

# decision index — frontmatter carries the dimension slug only.
# These entries are not empty decisions: rationale prose AND `**Evidence:**`
# bullets live in the body under the matching `### <dimension>` block.
# The schema is `.strict()` and rejects `decision:` / `evidence:` here.
decisions:
  - dimension: color-strategy            # freeform slug
  - dimension: spatial-system
  - dimension: composition-patterns      # optional: response/output shapes

# promoted review checks — optional. Candidate checks stay outside the file
# until a human curator promotes them.
checks:
  - id: no-off-palette-hex
    canonical: color-strategy
    kind: color
    summary: Hex literals must come from the documented palette
    pattern: '#[0-9a-fA-F]{3,8}'
    enforce_at: [className, css_var, inline_style]
    observed_count: 31                  # count the guarded pattern
    support: 0.94                       # conformers / observed cases

# concrete tokens
palette:
  dominant:
    - { role: primary, value: "#0066cc" }
  neutrals:
    steps: ["#ffffff", "#f5f5f5", "#999999", "#0a0a0a"]
    count: 4
  semantic:
    - { role: danger, value: "#dc2626" }
  saturationProfile: muted          # muted | vibrant | mixed
  contrast: high                    # high | moderate | low

spacing:
  scale: [4, 8, 12, 16, 24, 32]     # px
  regularity: 0.9                   # 0-1
  baseUnit: 4                       # px | null

typography:
  families: ["Inter", "Geist Mono"]
  sizeRamp: [12, 14, 16, 20, 24, 32]  # px
  weightDistribution: { "400": 5, "700": 3 }
  lineHeightPattern: normal          # tight | normal | loose

surfaces:
  borderRadii: [4, 8, 12]           # px
  shadowComplexity: subtle          # deliberate-none | subtle | layered
  borderUsage: moderate             # minimal | moderate | heavy

# extension bag (optional, opaque to comparisons)
metadata:
  tone: editorial
---
```

## Body (prose layer)

```markdown
# Character

2-4 sentences capturing the holistic personality of this design language. This is `observation.summary`. Describe the language directly; do not introduce the repo/project name as the subject unless the name is itself a visible brand/design fact.

# Signature

2-4 sentences capturing the dominant moves, repeated layout posture, and recognizable final picture. This is `expression.signature`; it is not a token dump.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision. This is `decisions[i].decision` — the implementation-agnostic statement of the pattern. One `### <dimension>` block per entry in `decisions`, matched by dimension slug.

**Evidence:**
- `--color-primary: #0066cc` resolves the primary action color
- Survey color evidence: 31 of 33 color observations fall on the documented palette

### spatial-system

Prose rationale for the spatial-system decision.

**Evidence:**
- `--space-4: 16px`
- Survey spacing evidence: padding, gap, and margin observations cluster on 4px increments

### composition-patterns

Prose rationale for how generated outputs should choose article, tracker, comparison, card, or control-surface shapes. Use this when the project has examples or docs that prove composition is part of the design language.

**Evidence:**
- `registry examples distinguish atom demos from shape demos`

# Fragments

- [embedding](embedding.md)
```

## The partition (the one rule)

Every field lives in exactly one layer:

| Field | Layer |
|---|---|
| `id`, `source`, `timestamp`, `sources` | Frontmatter |
| `references.specs/components/examples` | Frontmatter (local provenance / optional source material) |
| `observation.personality`, `observation.resembles` | Frontmatter |
| `observation.summary` | **Body** (`# Character`) |
| `signature` | **Body** (`# Signature`) |
| `decisions[].dimension` | Frontmatter |
| `decisions[].decision` (prose) | **Body** (`### <dimension>` block) |
| `decisions[].evidence` | **Body** (`**Evidence:**` bullets under `### <dimension>`) |
| `checks[]` | Frontmatter |
| `palette`, `spacing`, `typography`, `surfaces` | Frontmatter |
| `embedding` | Sibling `embedding.md` |

Putting prose into frontmatter is a schema error. The writer and reader both enforce this. When in doubt: structured data → frontmatter; narrative → body.

Evidence bullets are provenance, not portable instructions. Prefer survey-grounded patterns, token names, values, counts, and generic surface roles. A local path can appear as supporting provenance, but the claim should still make sense to a downstream project that cannot open the original file.

## Validation

    ghost-expression lint expression.md

This catches schema violations, missing required fields, prose-in-frontmatter, orphaned decision blocks (body `### dim` with no matching frontmatter entry, or vice versa), and uncited palette entries (info-level — palette colors not cited in any decision evidence/prose).

Canonical decision dimensions include `composition-patterns` for task-shaped output structure: article for plans/timelines/worksheets, tracker for metrics/progress/reviews, comparison for tradeoffs/options, and card for compact focused recommendations or repeated peer items. Card is one shape, not the default form of every generated answer.
