# The Fingerprint Package Format

A Ghost fingerprint is a repo-local design memory package, not one Markdown
file. The canonical on-disk shape is:

```text
.ghost/fingerprint/
  map.md
  survey.json
  profile.md
  checks.yml
```

Checks fail builds. Profile shapes judgment. Survey grounds both. The package is
the fingerprint.

## Package Artifacts

### `map.md`

`map.md` is the routing layer. It tells Ghost where UI surfaces live, which
scopes own which paths, and how changed files should find relevant evidence and
checks. It uses `ghost.map/v2` frontmatter plus a short human-readable topology
body.

Validate it directly or as part of the package:

```bash
ghost-fingerprint lint .ghost/fingerprint/map.md
ghost-fingerprint lint .ghost/fingerprint
```

### `survey.json`

`survey.json` is factual observed evidence. It records concrete values, tokens,
components, and implemented UI surfaces with counts and examples. Agents should
use it to ground claims rather than inventing design rules from prose alone.

Useful derived views:

```bash
ghost-fingerprint survey summarize .ghost/fingerprint/survey.json
ghost-fingerprint survey catalog .ghost/fingerprint/survey.json
ghost-fingerprint survey patterns .ghost/fingerprint/survey.json
```

### `profile.md`

`profile.md` is the non-enforcing design-language prior. It is Markdown with
YAML frontmatter for compact value digests plus prose for judgment-heavy design
guidance.

Required frontmatter remains focused on design-language evidence:

```yaml
---
id: cash-ios
source: llm
timestamp: 2026-05-06T00:00:00Z
references:
  specs: [Code/DesignSystem]
  examples: [Code/Features/Lending]
observation:
  personality: [restrained, utilitarian]
  resembles: [cash-app]
decisions:
  - dimension: color-strategy
  - dimension: spatial-system
palette:
  dominant: []
  neutrals: { steps: [], count: 0 }
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [4, 8, 12, 16], baseUnit: 4, regularity: 1 }
typography:
  families: []
  sizeRamp: []
  weightDistribution: {}
  lineHeightPattern: normal
surfaces:
  borderRadii: []
  shadowComplexity: deliberate-none
  borderUsage: minimal
---
```

The body stores `# Character`, `# Signature`, and `# Decisions` with
`### <dimension>` blocks and evidence bullets. Write the body so it can shape
generation and advisory review. Do not put enforceable gates in `profile.md`.
`checks[]` is not part of profile frontmatter.

Validate fidelity:

```bash
ghost-fingerprint verify-profile .ghost/fingerprint/profile.md .ghost/fingerprint/survey.json --root .
```

`verify-profile` checks that profile palette, spacing, typography, radii, and
shadow posture are backed by survey evidence. It does not calibrate gates.

### `checks.yml`

`checks.yml` is the only blocking layer in v1. It uses `ghost.checks/v1` and
contains human-promoted deterministic gates.

```yaml
schema: ghost.checks/v1
id: cash-ios
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    applies_to:
      scopes: [lending]
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}|UIColor\\('
      contexts: [swift]
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
    repair: Replace literals with Arcade/Cash semantic tokens.
```

Supported detector types:

- `forbidden-regex`
- `required-regex`
- `banned-import`
- `banned-component`
- `required-token`

Statuses:

- `active`: enforced by `ghost-drift check`
- `proposed`: linted as a candidate, not enforced
- `disabled`: retained as historical context, not enforced

## Drift Gates

Run deterministic gates against a diff:

```bash
ghost-drift check --base main
ghost-drift check --diff change.patch --format json
```

`ghost-drift check` reads package `map.md`, `survey.json`, and `checks.yml`,
routes changed files through map scopes, applies matching active checks, emits
stable JSON or Markdown, and exits nonzero on active check failures.

Advisory review remains separate:

```bash
ghost-drift review --base main
```

Advisory findings are non-blocking unless tied to an active deterministic check.
Every finding should cite a diff location, profile section, survey evidence,
precedent/example, and repair.
