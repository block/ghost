# fingerprint.md schema reference

Expected filename: `fingerprint.md`.

`fingerprint.md` is the authored design-language contract. It may point at local `references`, but sibling files are not auto-loaded as authored truth: no `embedding.md`, no `# Fragments`, and no implicit `decisions/` directory.

## Frontmatter

```yaml
---
id: my-project
source: llm                     # registry | extraction | llm | unknown
timestamp: 2026-04-20T00:00:00Z
sources: [github:owner/repo]
references:
  specs: [src/styles/tokens.css]
  components: [src/components/ui]
  examples: [docs/examples/dashboard.md]

observation:
  personality: [restrained, editorial]
  resembles: [linear, notion]

decisions:
  - dimension: color-strategy
  - dimension: spatial-system
  - dimension: composition-patterns

checks:
  - id: no-off-palette-hex
    canonical: color-strategy
    kind: color
    summary: Hex literals must come from the documented palette
    pattern: '#[0-9a-fA-F]{3,8}'
    paths: [src]
    contexts: [className, css_var, inline_style]
    observed_count: 31
    support: 0.94

palette:
  dominant:
    - { role: primary, value: "#0066cc" }
  neutrals:
    steps: ["#ffffff", "#f5f5f5", "#0a0a0a"]
    count: 3
  semantic:
    - { role: danger, value: "#dc2626" }
  saturationProfile: muted
  contrast: high

spacing:
  scale: [4, 8, 12, 16, 24, 32]
  regularity: 0.9
  baseUnit: 4

typography:
  families: ["Inter", "Geist Mono"]
  sizeRamp: [12, 14, 16, 20, 24, 32]
  weightDistribution: { "400": 5, "700": 3 }
  lineHeightPattern: normal

surfaces:
  borderRadii: [4, 8, 12]
  shadowComplexity: subtle
  borderUsage: moderate

metadata:
  tone: editorial
---
```

Required: `id`, `source`, `timestamp`, `palette`, `spacing`, `typography`, `surfaces`.

Optional: `sources`, `references`, `observation.personality`, `observation.resembles`, `decisions[]`, `checks[]`, `metadata`, and meta fields such as `name`, `slug`, `generator`, `confidence`, `generated`, `extends`.

Forbidden in frontmatter: root `embedding`, `decisions[].embedding`, `observation.summary`, `decisions[].decision`, `decisions[].evidence`, `checks[].enforce_at`, `checks[].rationale`, and unknown root keys such as `schema`.

## Body

```markdown
# Character

2-4 sentences capturing the holistic personality of this design language.

# Signature

2-4 sentences capturing the dominant moves, repeated layout posture, and recognizable final picture.

# Decisions

### color-strategy

Prose rationale for the color-strategy decision.

**Evidence:**
- `--color-primary: #0066cc` resolves the primary action color
- Survey color evidence: 31 of 33 color observations fall on the documented palette
```

The parser matches `### dimension` blocks to `decisions[].dimension` by slug. Evidence bullets live in the body. Putting rationale or evidence into YAML is a schema error.

## Checks

`checks[]` are human-promoted PR review gates, not candidate scratch space.

- `paths` are repo-relative filesystem scopes used by `verify-profile` for deterministic count calibration.
- `contexts` are reviewer/generator hints such as `className`, `css_var`, `inline_style`, or `import`.
- `summary` is the short reviewer label.
- The rationale belongs in the matching Decision body.

## Validation

```bash
ghost-fingerprint lint fingerprint.md
ghost-fingerprint verify-profile fingerprint.md survey.json --root .
```

`lint` validates shape and partition. `verify-profile` validates survey fidelity: palette, spacing, typography, radii, and shadow posture must be backed by `survey.json`, and promoted checks must carry calibrated `paths`, `observed_count`, and `support`.

Use `ghost-fingerprint survey summarize survey.json` for broad profiling context and `ghost-fingerprint survey catalog survey.json --kind <kind>` for compact value enums/specs. Raw `survey.json` is for targeted row lookup.
