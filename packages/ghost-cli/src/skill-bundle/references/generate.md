# Recipe: Generate UI from a fingerprint.md

**Goal:** produce a UI artifact (component, page, snippet) that lives within the `fingerprint.md` boundaries.

Ghost's CLI does not generate code — you do. The fingerprint is the constraint.

## Steps

### 1. Load the fingerprint

Read `fingerprint.md` from the project. The key constraints are:

- `palette` — which colors are allowed, and what role each plays
- `spacing.scale` — which spacing values are allowed
- `typography.families` / `typography.sizeRamp` — allowed font families and sizes
- `surfaces.borderRadii` — allowed radii
- `decisions` — the *patterns* to respect (e.g. "no shadows", "all interactive surfaces animate on hover")
- `roles` — the existing slot → token bindings (reuse them where possible)

### 2. Generate against those constraints

Write the UI code using only values from the fingerprint. If you need a color, pick from `palette`. If you need spacing, snap to a step in `spacing.scale`.

Respect the decisions. If the fingerprint says "no shadows", don't add `box-shadow`. If it says "all interactive surfaces animate", add the transition.

If the fingerprint is missing a token you need (e.g. you need a warning color but `palette.semantic` has none), **do not invent one**. Flag the gap to the user — they either need to add it to the fingerprint, or use an existing semantic as the closest fit.

### 3. Verify

Run the [verify recipe](verify.md) — self-review the generated code against the fingerprint and iterate if needed.

## Output conventions

- Prefer CSS custom properties referencing the fingerprint's tokens (`var(--color-primary)`) over literal hex values, when the project uses custom properties.
- Prefer existing `roles[]` bindings over re-deriving slot styles from scratch.
