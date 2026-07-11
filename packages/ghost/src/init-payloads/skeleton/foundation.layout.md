---
description: "Layout — stacks with five gap steps, surface roles, three elevation tiers, the two radius roles, and misuse; radius values are an open question. Read before laying anything out."
---

## Usage

All layout is stacks. Rhythm comes from relationships between siblings, not
from isolated margins pasted onto whichever element was last touched. The
gap steps are exactly five: `--gap-xs` through `--gap-xl`. Choose the gap
that states the relationship; do not tune by single pixels to make a
screenshot pass. The default is column, medium gap. Columns are for almost
everything — forms, cards, modal bodies, settings, page sections. Rows are
conditional: controls, metadata lines, paired label/value moments. If a row
wraps awkwardly, it wanted to be a column.

Surface is the only way an element gets a background, border, radius, or
shadow. The vocabulary is closed: role, padding, radius, border, elevation.
The default surface is flat — no border, no shadow. We do not outline
everything to prove layout exists.

The elevation tiers are exactly three: card, popover, modal. Elevation
implies hierarchy — a card sits in flow, a popover floats above it, a modal
interrupts the task. Pick the tier that matches the interaction.

Borders are structural — inputs and overlays — not decorative frames around
ordinary text. Use space, tone, and type hierarchy instead.

## Radius

Open — ask the human; do not freehand. The fixed relationship: controls and
surfaces carry different radius roles, and the two never swap. Buttons and
inputs take `--radius-control`; cards and containers take
`--radius-surface`. One radius for what you click, one for what contains.
The open question: how round is a control, and how round is a surface? When
answered, restate this section as the brand's current answer. Until then,
choose provisional values and label them.

## Misuse

- No ad-hoc margins between siblings — they hide the rhythm. Change the
  stack gap or split the stack.
- No custom shadows because a composition feels flat, and no modal gravity
  on a routine card. Component shadows belong to the primitives that own
  them.
- Never one radius everywhere by reflex.
