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

# narrative tags (prose lives in the body)
observation:
  personality: [restrained, editorial]   # 3-6 adjectives
  resembles: [linear, notion]       # 1-3 known references this resembles

# abstract design decisions — frontmatter carries the dimension slug only.
# Rationale prose AND `**Evidence:**` bullets live in the body under the
# matching `### <dimension>` block. The schema is `.strict()` and rejects
# `evidence:` (or any other field) here.
decisions:
  - dimension: color-strategy            # freeform slug
  - dimension: spatial-system

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

# slot → token bindings (optional but strongly recommended)
#
# `roles[].tokens.palette` is an open record — slot keys are free-form.
# Reach for the conventional vocabulary first: `background`, `foreground`,
# `surface`, `border`, `accent`, `muted`, `link`. Add others (`ring`,
# `popover`, `separator`, …) when they're load-bearing in your codebase.
#
# Slot values are either:
#   - raw hex literals — `"#1a1a1a"`
#   - local refs — `"{palette.dominant.<role>}"` / `"{palette.semantic.<role>}"`
#   - opaque external refs — `"{base.color.brand.x}"` for token-pipeline
#     consumers; the linter accepts these as deliberate passthroughs and
#     does not try to resolve them
#
# Other dimensions (typography, spacing, surfaces) inline raw values.
roles:
  - name: h1
    tokens:
      typography: { family: "Geist", size: 52, weight: 500 }
    evidence: ["src/components/h1.tsx:4"]
  - name: button
    tokens:
      surfaces: { borderRadius: 8 }
      palette:
        background: "{palette.dominant.accent}"
        foreground: "{palette.dominant.surface}"
        border: "{palette.semantic.border-default}"
    evidence: ["src/components/button.tsx:12"]

# extension bag (optional, opaque to comparisons)
metadata:
  tone: editorial
---
```

## Body (prose layer)

```markdown
# Character

2-4 sentences capturing the holistic personality of this design language. This is `observation.summary`.

# Signature

- What makes this expression visually distinctive (becomes `observation.distinctiveTraits`).
- One bullet per trait. Include notable *absences* if they are load-bearing.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision. This is `decisions[i].decision` — the implementation-agnostic statement of the pattern. One `### <dimension>` block per entry in `decisions`, matched by dimension slug.

**Evidence:**
- `--color-primary: #0066cc`
- `src/theme.ts:12`

### spatial-system

Prose rationale for the spatial-system decision.

**Evidence:**
- `--space-4: 16px`

# Fragments

- [embedding](embedding.md)
```

## The partition (the one rule)

Every field lives in exactly one layer:

| Field | Layer |
|---|---|
| `id`, `source`, `timestamp`, `sources` | Frontmatter |
| `observation.personality`, `observation.resembles` | Frontmatter |
| `observation.summary` | **Body** (`# Character`) |
| `observation.distinctiveTraits` | **Body** (`# Signature` bullets) |
| `decisions[].dimension` | Frontmatter |
| `decisions[].decision` (prose) | **Body** (`### <dimension>` block) |
| `decisions[].evidence` | **Body** (`**Evidence:**` bullets under `### <dimension>`) |
| `palette`, `spacing`, `typography`, `surfaces`, `roles` | Frontmatter |
| `embedding` | Sibling `embedding.md` |

Putting prose into frontmatter is a schema error. The writer and reader both enforce this. When in doubt: structured data → frontmatter; narrative → body.

## Validation

    ghost-expression lint expression.md

This catches schema violations, missing required fields, prose-in-frontmatter, orphaned decision blocks (body `### dim` with no matching frontmatter entry, or vice versa), and uncited palette entries.
