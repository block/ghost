# Root Fingerprint Bundle Schema Reference

Canonical package:

```text
.ghost/
  resources.yml  ghost.resources/v1
  map.md         ghost.map/v2
  survey.json    ghost.survey/v2
  patterns.yml   ghost.patterns/v1
  checks.yml     optional ghost.checks/v1 gates
  intent.md      optional human intent
```

## `resources.yml`

```yaml
schema: ghost.resources/v1
id: my-project
primary:
  target: .
  paths: [src]
design_system:
  - id: ui
    target: ../ui
    paths: [packages/ui]
surfaces:
  - id: settings
    locator: /settings
    paths: [src/routes/settings.tsx]
include: ["src/**"]
exclude: ["**/node_modules/**"]
```

## `patterns.yml`

```yaml
schema: ghost.patterns/v1
id: my-project
surface_types:
  - id: settings
    preferred_patterns: [settings-stack]
    evidence:
      - surface_id: settings-account
composition_patterns:
  - id: settings-stack
    surface_types: [settings]
    frequency: 4
    confidence: 0.8
    anatomy:
      ordered: [shell, compact-header, sections, actions]
      required: [sections]
      forbidden: [oversized-hero]
    evidence:
      - surface_id: settings-account
        locator: /settings/account
```

## `checks.yml`

```yaml
schema: ghost.checks/v1
id: my-project
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    applies_to:
      scopes: [checkout]
      paths: [src/checkout]
      surface_types: [resource-index]
      pattern_ids: [dense-resource-index]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.94
      observed_count: 31
      examples:
        - src/checkout/Button.tsx
```

Detector types remain deterministic only:

- `forbidden-regex`
- `required-regex`
- `banned-import`
- `banned-component`
- `required-token`

## Validation

```bash
ghost-fingerprint lint .ghost
ghost-fingerprint verify .ghost --root .
ghost-drift check --base main
```

`lint` validates artifact shape. `verify` validates cross-artifact fidelity:
resources resolve, patterns cite survey evidence, and checks reference known
pattern IDs. `ghost-drift check` is the deterministic pass/fail gate.
