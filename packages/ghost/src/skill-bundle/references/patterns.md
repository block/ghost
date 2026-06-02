---
name: patterns
description: Author product-experience patterns inside .ghost/fingerprint.yml.
handoffs:
  - label: Verify bundle
    command: ghost verify .ghost --root .
    prompt: Verify the root fingerprint bundle
---

# Recipe: Author Fingerprint Patterns

**Goal:** write useful `patterns[]` entries in `.ghost/fingerprint.yml`.

Patterns are durable product-experience memory. They may describe visual,
behavioral, content, or composition choices. They are not a raw inventory of
everything the repo does.

## When To Add A Pattern

Add a pattern when it helps a future agent choose or review:

- a repeated layout or surface structure
- a content or disclosure convention
- a behavior or recovery flow
- a visual treatment tied to product meaning
- a restraint rule that preserves hierarchy, density, trust, or pacing

Do not add a pattern just because a value or component exists. Put raw
observations in `.ghost/cache/` or keep them in scratch notes.

## Shape

```yaml
patterns:
  - id: resource-index-stays-tabular
    status: accepted
    kind: composition
    pattern: Resource index views stay tabular when comparison is the task.
    applies_to:
      surface_types: [resource-index]
      paths: [src/orders]
    guidance:
      - Preserve row density and sortable columns.
      - Avoid decorative card grids for primary comparison views.
    evidence:
      - path: src/orders/index.tsx
```

Allowed `kind` values:

- `visual`
- `behavioral`
- `content`
- `composition`

## Authoring Rules

- Use stable slugs.
- Keep the pattern actionable for generation and review.
- Cite paths, locators, or notes as evidence.
- Put obligations that affect failure, disclosure, recovery, or trust in
  `experience_contracts`, not only `patterns`.
- Put broad product judgment in `principles`.
- Add `check_refs` only when a deterministic check exists in `checks.yml`.

## Validate

```bash
ghost lint .ghost
ghost verify .ghost --root .
```

If a pattern is speculative, do not add it as accepted memory. Recommend or
create a proposal only when the speculation is durable enough to help future
generation or review: repeated, high-impact, explicitly human-stated, likely to
recur, or blocking confident review.
