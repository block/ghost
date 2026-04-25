---
name: generate
description: Produce UI code that lives within expression.md bounds.
handoffs:
  - label: Verify the generated UI matches the expression
    skill: verify
    prompt: Verify the UI I just generated against expression.md
---

# Recipe: Generate UI from an expression.md

**Goal:** produce a UI artifact (component, page, snippet) that lives within the `expression.md` boundaries.

Ghost's CLI does not generate code — you do. The expression is the constraint.

## Steps

### 1. Load the expression

Start with a section map:

    ghost-drift describe expression.md

Generation always needs the **frontmatter** (palette, spacing.scale, typography.families/sizeRamp, surfaces.borderRadii, roles[]) — read that whole range. Then layer on decision sections by relevance to what you're generating:

- Building an interactive surface (button, input, badge) → `### shape-language`, `### interactive-patterns`, `### density`, plus any role binding for that component name in `roles[]`
- Building a structural surface (card, modal, page) → `### surface-hierarchy`, `### elevation`, `### spatial-system`
- Building anything text-heavy → `### typography-voice`
- Anything with state or feedback (alerts, toasts, charts) → `### color-strategy`

If the component spans multiple categories, or you're unsure, **read the entire `# Decisions` block** — typically 2–4k tokens, cheaper than generating something that contradicts a decision.

The key constraints surfaced in the frontmatter are:

- `palette` — which colors are allowed, and what role each plays
- `spacing.scale` — which spacing values are allowed
- `typography.families` / `typography.sizeRamp` — allowed font families and sizes
- `surfaces.borderRadii` — allowed radii
- `decisions` — the *patterns* to respect (e.g. "no shadows", "all interactive surfaces animate on hover")
- `roles` — the existing slot → token bindings (reuse them where possible)

### 2. Generate against those constraints

Write the UI code using only values from the expression. If you need a color, pick from `palette`. If you need spacing, snap to a step in `spacing.scale`.

Respect the decisions. If the expression says "no shadows", don't add `box-shadow`. If it says "all interactive surfaces animate", add the transition.

If the expression is missing a token you need (e.g. you need a warning color but `palette.semantic` has none), **do not invent one**. Flag the gap to the user — they either need to add it to the expression, or use an existing semantic as the closest fit.

### 3. Verify

Run the [verify recipe](verify.md) — self-review the generated code against the expression and iterate if needed.

## Output conventions

- Prefer CSS custom properties referencing the expression's tokens (`var(--color-primary)`) over literal hex values, when the project uses custom properties.
- Prefer existing `roles[]` bindings over re-deriving slot styles from scratch.
