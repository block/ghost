# fingerprint.md schema reference

Canonical filename: `fingerprint.md`.

Companion file: `embedding.md` (sibling fragment containing the 49-dim vector). The CLI writes it automatically when you write a `fingerprint.md` via `ghost-drift`; you can also compute and append it yourself.

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
  closestSystems: [linear, notion]       # 1-3 known systems this resembles

# abstract design decisions
decisions:
  - dimension: color-strategy            # freeform slug
    evidence:
      - "--color-primary: #0066cc"
      - "src/theme.ts:12"
  - dimension: spatial-system
    evidence: ["--space-4: 16px"]

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
  shadowComplexity: subtle          # none | subtle | layered
  borderUsage: moderate             # minimal | moderate | heavy

# slot → token bindings (optional but strongly recommended)
# Role palette fields may use `{palette.dominant.<role>}` or
# `{palette.semantic.<role>}` references instead of raw hexes.
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

- What makes this system visually distinctive (becomes `observation.distinctiveTraits`).
- One bullet per trait. Include notable *absences* if they are load-bearing.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision. This is `decisions[i].decision` — the implementation-agnostic statement of the pattern. One `### <dimension>` block per entry in `decisions`, matched by dimension slug.

### spatial-system

...

# Fragments

- [embedding](embedding.md)
```

## The partition (the one rule)

Every field lives in exactly one layer:

| Field | Layer |
|---|---|
| `id`, `source`, `timestamp`, `sources` | Frontmatter |
| `observation.personality`, `observation.closestSystems` | Frontmatter |
| `observation.summary` | **Body** (`# Character`) |
| `observation.distinctiveTraits` | **Body** (`# Signature` bullets) |
| `decisions[].dimension`, `decisions[].evidence` | Frontmatter |
| `decisions[].decision` (prose) | **Body** (`### <dimension>` block) |
| `palette`, `spacing`, `typography`, `surfaces`, `roles` | Frontmatter |
| `embedding` | Sibling `embedding.md` |

Putting prose into frontmatter is a schema error. The writer and reader both enforce this. When in doubt: structured data → frontmatter; narrative → body.

## Validation

    ghost-drift lint fingerprint.md

This catches schema violations, missing required fields, prose-in-frontmatter, orphaned decision blocks (body `### dim` with no matching frontmatter entry, or vice versa), and uncited palette entries.
