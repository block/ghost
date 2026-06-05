---
name: map
description: Use repo topology as optional source material for inventory.yml.
handoffs:
  - label: Update fingerprint layers
    skill: capture
    prompt: Use topology observations to update .ghost/fingerprint/inventory.yml
---

# Recipe: Read Topology For Ghost

`map.md` is no longer the canonical fingerprint stage. Topology belongs in
`.ghost/fingerprint/inventory.yml` under `topology`.

Use this recipe when an older workflow, existing repo, or migration still has a
`.ghost/map.md`, or when you need to orient before writing `inventory.yml`.

## What To Record

Look for facts that help agents route product-experience judgment:

- product scopes and owned paths
- surface types
- exemplar surfaces worth inspecting
- frameworks, platforms, and rendering constraints
- design-system or component-library locations
- places where UI can actually be observed

Promote only durable routing facts into `inventory.yml`:

```yaml
topology:
  scopes:
    - id: checkout
      paths: [src/checkout]
      surface_types: [payment-review]
  surface_types: [payment-review, empty-state]
exemplars:
  - id: checkout-review
    path: src/checkout/review.tsx
    surface_type: payment-review
    scope: checkout
    why: Shows the payment-review surface worth preserving.
```

## Optional Inventory

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory . > .ghost/fingerprint/sources/cache/inventory.json
```

Generated cache is scratch material. Read it for hints, then author
`inventory.yml` by judgment. Do not treat file counts, manifests, or
candidate config files as product-experience authority by themselves.

## Legacy Maps

If `.ghost/map.md` already exists, read it as source material. Do not require a
new project to create one before `inventory.yml`.
