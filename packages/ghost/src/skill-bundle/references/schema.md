# Root Fingerprint Bundle Schema Reference

Canonical package:

```text
.ghost/
  fingerprint.yml ghost.fingerprint/v1
  checks.yml     optional ghost.checks/v1 gates
  intent.md      optional human intent
  decisions/     optional ghost.decision/v1 rationale
  proposals/     optional ghost.proposal/v1 candidates
  cache/         optional generated caches
```

## `fingerprint.yml`

```yaml
schema: ghost.fingerprint/v1
summary:
  product: Example dashboard
  goals:
    - Preserve dense comparison workflows.
  anti_goals:
    - Do not turn operational screens into marketing pages.
topology:
  scopes:
    - id: orders
      paths: [src/orders]
      surface_types: [resource-index]
situations:
  - id: triaging-orders
    title: Triaging orders
    product_obligation: Keep status, owner, and recovery actions visible.
principles:
  - id: density-supports-comparison
    status: accepted
    principle: Dense work surfaces prioritize scanning and comparison.
experience_contracts:
  - id: destructive-actions-disclose-consequence
    status: accepted
    contract: Destructive actions disclose consequence and recovery path.
patterns:
  - id: resource-index-stays-tabular
    status: accepted
    kind: composition
    pattern: Resource index views stay tabular when comparison is the task.
    evidence:
      - path: src/orders/index.tsx
implementation_vocabulary:
  tokens: [color.background, color.text]
  components: [DataTable]
  notes:
    - Current vocabulary is replaceable implementation material.
review_policy:
  proposal_policy:
    - Agents propose memory changes; humans promote durable truth.
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
    derives_from: pattern:tokenized-ui-color
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

## `proposals/*.yml`

```yaml
schema: ghost.proposal/v1
id: saved-payment-empty-state
status: open
kind: missing-memory
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery over education.
rationale: The user is blocked from paying, not browsing product concepts.
scope:
  roles: [design, pm, qa]
  surface_types: [empty-state]
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: fingerprint
  summary: Promote into fingerprint.yml if repeated.
```

## Validation

```bash
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main
```

`lint` validates artifact shape. `verify` validates cross-artifact fidelity:
fingerprint evidence paths resolve and checks reference known fingerprint
memory. Optional decisions/proposals are linted when present. `ghost check` is
the deterministic pass/fail gate.
