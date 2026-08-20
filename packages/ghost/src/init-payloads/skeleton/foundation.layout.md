---
for: Laying out any view.
---

Starter guidance the brand owner has not yet reviewed. Cite it as provisional
until a human edits or confirms this chapter.

## Usage

All layout is stacks. Rhythm comes from relationships between siblings, not
from isolated margins pasted onto whichever element was last touched. Choose
the gap that states the relationship; do not tune by single pixels to make a
screenshot pass. The default is column, medium gap. Columns are for almost
everything — forms, cards, modal bodies, settings, page sections. Rows are
conditional: controls, metadata lines, paired label/value moments. If a row
wraps awkwardly, it wanted to be a column.

Surface is the only way an element gets a background, border, radius, or
shadow. The default surface is flat — no border, no shadow. We do not
outline everything to prove layout exists. Elevation implies hierarchy — a
card sits in flow, a popover floats above it, a modal interrupts the task.

Borders are structural — inputs and overlays — not decorative frames around
ordinary text. Use space, tone, and type hierarchy instead.

## Rules

- The gap steps are exactly five: `--gap-xs` through `--gap-xl`.
- The surface vocabulary is closed: role, padding, radius, border,
  elevation.
- The elevation tiers are exactly three: card, popover, modal. Pick the
  tier that matches the interaction.
- Buttons and inputs take `--radius-control`; cards and containers take
  `--radius-surface`. The two never swap.
- Known gap — the radius values are unanswered. The fixed relationship: one
  radius for what you click, one for what contains. The open question: how
  round is a control, and how round is a surface? Ask the human; do not
  invent values. Until answered, choose provisional values and label them.
  When answered, restate this rule as the brand's current answer.

## Never

- Never add ad-hoc margins between siblings — they hide the rhythm; change
  the stack gap or split the stack.
- Never add a custom shadow because a composition feels flat, and never give
  modal gravity to a routine card — component shadows belong to the
  primitives that own them.
- Never apply one radius everywhere by reflex — the control and surface
  roles exist to differ.
