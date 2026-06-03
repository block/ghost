---
name: map
description: Use repo topology as optional source material for fingerprint.yml.
handoffs:
  - label: Capture fingerprint memory
    skill: capture
    prompt: Use topology observations to update .ghost/fingerprint.yml
---

# Recipe: Read Topology For Ghost

`map.md` is no longer the canonical fingerprint stage. Topology belongs in
`.ghost/fingerprint.yml` under `topology`.

Use this recipe when an older workflow, existing repo, or migration still has a
`.ghost/map.md`, or when you need to orient before writing `fingerprint.yml`.

## What To Capture

Look for facts that help agents route product-experience judgment:

- product scopes and owned paths
- surface types
- exemplar surfaces worth inspecting
- frameworks, platforms, and rendering constraints
- design-system or component-library locations
- places where UI can actually be observed

Promote only durable routing facts into `fingerprint.yml`:

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
mkdir -p .ghost/cache
ghost inventory . > .ghost/cache/inventory.json
```

Inventory is cache. Read it for hints, then author `fingerprint.yml` by
judgment. Do not treat file counts, manifests, or candidate config files as
product-experience memory by themselves.

## Legacy Maps

If `.ghost/map.md` already exists, read it as source material. Do not require a
new project to create one before `fingerprint.yml`.
