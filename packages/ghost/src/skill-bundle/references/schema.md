# Root Fingerprint Package Schema Reference

Core package:

```text
.ghost/
  fingerprint.yml ghost.fingerprint/v2
  checks.yml      optional ghost.checks/v2 gates
```

Optional files:

```text
.ghost/
  intent.md       optional human intent
  decisions/      optional ghost.decision/v1 rationale
  cache/          optional generated caches
```

Git is the approval boundary: checked-in `fingerprint.yml` is canonical,
and uncommitted or unmerged edits are draft work. Ghost validates fingerprint layers and
runs gates; it is not a lifecycle manager, proposal system, or design-system
registry.

`fingerprint.yml` may start sparse:

```yaml
schema: ghost.fingerprint/v2
```

Layer sections are optional on disk and default internally to empty `prose`,
`inventory`, and `composition` buckets.

Advanced nested packages use the same shape at any product-area root, for example
`apps/checkout/.ghost/`. Resolve the stack with `ghost stack <path>`; child
entries with the same `id` override parent entries.

## `fingerprint.yml`

```yaml
schema: ghost.fingerprint/v2
prose:
  summary:
    product: Example dashboard
    goals:
      - Preserve dense comparison workflows.
    anti_goals:
      - Do not turn operational screens into marketing pages.
  situations:
    - id: triaging-orders
      title: Triaging orders
      product_obligation: Keep status, owner, and recovery actions visible.
  principles:
    - id: density-supports-comparison
      principle: Dense work surfaces prioritize scanning and comparison.
  experience_contracts:
    - id: destructive-actions-disclose-consequence
      contract: Destructive actions disclose consequence and recovery path.
inventory:
  topology:
    scopes:
      - id: orders
        paths: [src/orders]
        surface_types: [resource-index]
  building_blocks:
    tokens: [color.background, color.text]
    components: [DataTable]
    libraries: []
    assets: []
    routes: [src/orders/routes.tsx]
    files: [src/orders/index.tsx]
    notes:
      - Current inventory is replaceable implementation material.
  exemplars:
    - id: orders-index
      path: src/orders/index.tsx
      title: Orders index
      surface_type: resource-index
      scope: orders
      why: Shows the dense tabular precedent for order triage.
      refs: [composition.pattern:resource-index-stays-tabular]
composition:
  patterns:
    - id: resource-index-stays-tabular
      kind: structure
      pattern: Resource index views stay tabular when comparison is the task.
      evidence:
        - path: src/orders/index.tsx
```

Use these typed refs:

- `prose.situation:<id>`
- `prose.principle:<id>`
- `prose.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `check:<id>`

## `checks.yml`

```yaml
schema: ghost.checks/v2
id: my-project
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      composition:
        - composition.pattern:tokenized-ui-color
      inventory:
        - inventory.exemplar:checkout-review
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

Checks keep `status: active | proposed | disabled` because enforcement still
needs lifecycle state. Active checks need at least one prose or composition
derivation ref. Inventory refs can support a check, but inventory-only
grounding is not enough for an active gate. Fingerprint entries do not have
status fields.

## `decisions/*.yml`

```yaml
schema: ghost.decision/v1
id: checkout-reversibility
status: accepted
title: Reversibility before money movement
claim: Payment review must make reversibility visible before final submission.
rationale: Users need confidence before committing money movement.
scope:
  roles: [design, engineering, pm, qa]
  scopes: [checkout]
  surface_types: [payment-review]
  pattern_ids: [confirmation-before-commit]
evidence:
  - path: apps/checkout/review.tsx
    note: Review step exposes edit affordances before submit.
decided_at: "2026-05-17T00:00:00.000Z"
```

## Validation

```bash
ghost lint .ghost
ghost verify .ghost --root .
ghost lint --all
ghost verify --all
ghost check --base main
```

`lint` validates artifact shape. `verify` validates cross-artifact fidelity:
fingerprint evidence paths resolve and checks reference known fingerprint refs.
Exemplar paths are verified as inventory anchors. Optional decisions
are linted when present. `ghost check` is the deterministic pass/fail gate.
