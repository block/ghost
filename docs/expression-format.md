# The `expression.md` Format

A Ghost expression is the design-language contract agents read for generation and drift review. It is one Markdown file: YAML frontmatter for compact values, plus prose for the parts that need judgment.

`survey.json` stores the scan evidence. `survey catalog` and runtime embeddings are derived from existing files; regenerate them instead of editing them by hand.

## Shape

Frontmatter stores the compact data: identity, references, personality tags, decision slugs, promoted checks, and value digests.

The body stores the prose: `# Character`, `# Signature`, and `# Decisions` with `### <dimension>` blocks and `**Evidence:**` bullets.

Everything authored lives in `expression.md`. Readers do not auto-load `embedding.md`, `# Fragments`, or `decisions/*.md`. Comparisons compute embeddings at runtime from the parsed expression.

## Frontmatter

```yaml
---
id: claude
source: llm
timestamp: 2026-04-18T00:00:00Z
references:
  specs: [src/styles/tokens.css]
  components: [src/components/ui]
  examples: [docs/examples/dashboard.md]
observation:
  personality: [restrained, editorial]
  resembles: [notion, linear]
decisions:
  - dimension: color-strategy
  - dimension: spatial-system
checks:
  - id: no-off-palette-hex
    canonical: color-strategy
    kind: color
    summary: Hex literals must come from the documented palette
    pattern: '#[0-9a-fA-F]{3,8}'
    paths: [src]
    contexts: [className, css_var, inline_style]
    observed_count: 33
    support: 0.94
palette:
  dominant:
    - { role: accent, value: '#c96442' }
  neutrals:
    steps: ['#faf9f5', '#141413']
    count: 2
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing:
  scale: [4, 8, 12, 16, 24, 32]
  baseUnit: 8
  regularity: 0.85
typography:
  families: ['Inter']
  sizeRamp: [12, 14, 16, 20, 24, 32]
  weightDistribution: { 400: 3, 600: 2 }
  lineHeightPattern: normal
surfaces:
  borderRadii: [8, 12, 16]
  shadowComplexity: subtle
  borderUsage: moderate
---
```

Required: `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`.

Forbidden: root `embedding`, `decisions[].embedding`, `observation.summary`, `decisions[].decision`, `decisions[].evidence`, `checks[].enforce_at`, `checks[].rationale`, and unknown root keys such as `schema`.

`checks[].paths` are filesystem scopes used by `verify-profile` for counts. `checks[].contexts` are hints for reviewers and generators. Put the reason for a check in the matching Decision body; keep `summary` short.

## Body

```markdown
# Character

A warm, unhurried product language that lets prose and hierarchy carry the interface.

# Signature

Long editorial layouts, warm neutral surfaces, and quiet controls make generated output feel composed rather than widget-stacked.

# Decisions

### color-strategy

Every gray carries a warm undertone; hue appears only when it clarifies state or emphasis.

**Evidence:**
- `#faf9f5`, `#141413`, and `#c96442` appear in survey color rows
- Survey color evidence: 31 of 33 color observations fall on the documented palette
```

Write the body so it still makes sense outside the original repo. Local paths are fine as provenance, but Character, Signature, and Decisions should not depend on opening those files.

## Derived Views

- `ghost-expression survey summarize survey.json` gives a short profiling digest.
- `ghost-expression survey catalog survey.json [--kind <kind>]` lists exact values/specs from the survey.
- `ghost-drift compare` computes runtime embeddings from `expression.md`; there is no authored embedding file.

## Validation States

- `profile-valid`: `ghost-expression lint expression.md` and `ghost-expression verify-profile expression.md survey.json --root <target>` pass.
- `review-ready`: profile-valid plus human-promoted, calibrated `checks[]`.
- `survey-fresh`: latest survey/catalog agrees with the expression, or verifier warnings/errors explicitly surface drift.

`verify-profile` is intentionally stronger than lint: expression palette, spacing, typography, radii, and shadow posture must be survey-backed. High-salience values newly found in periodic surveys are reported as warnings; the expression is never auto-updated.
