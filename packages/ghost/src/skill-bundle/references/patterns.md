---
name: patterns
description: Author product-experience patterns inside .ghost/fingerprint.yml.
handoffs:
  - label: Verify fingerprint package
    command: ghost verify .ghost --root .
    prompt: Verify the root fingerprint package
---

# Recipe: Author Fingerprint Patterns

**Goal:** write useful `composition.patterns[]` entries in `.ghost/fingerprint.yml`.

Patterns are durable product-experience memory. They may describe rules,
layouts, structures, flows, states, content, behavior, or visual arrangements.
They are not a raw inventory of everything the repo does.

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
composition:
  patterns:
    - id: resource-index-stays-tabular
      kind: structure
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
- `behavior`
- `content`
- `rule`
- `layout`
- `structure`
- `flow`
- `state`

## Authoring Rules

- Use stable slugs.
- Keep the pattern actionable for generation and review.
- Cite paths, locators, or notes as evidence.
- Put obligations that affect failure, disclosure, recovery, or trust in
  `prose.experience_contracts`, not only `composition.patterns`.
- Put broad product judgment in `prose.principles`.
- Add `check_refs` only when a deterministic check exists in `checks.yml`.

## Validate

```bash
ghost lint .ghost
ghost verify .ghost --root .
```

If a pattern is speculative, do not add it as canonical composition. Leave it in
scratch notes or ask the user whether to edit `fingerprint.yml`.
