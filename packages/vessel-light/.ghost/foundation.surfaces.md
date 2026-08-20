---
for: Any card, popover, modal, dialog, scrim, or bordered container.
materials:
  - materials/primitives.css
  - materials/examples/composition.overlay.html
---

## Usage

Surface is the only way an element gets a background, border, radius, or
shadow. If a container needs visual treatment, it first needs a surface role.

The vocabulary is closed: role, padding, radius, border, and elevation. These
axes create enough range for page flow, cards, popovers, muted blocks,
accents, and dark moments without inventing one-off boxes.

Elevation implies hierarchy — a card sits in the document flow, a popover
floats above the flow, a modal interrupts the task. Pick the tier that
matches the interaction.

Borders are structural, especially for inputs and overlays. They are not
decorative frames around ordinary text.

The overlay reference shows the interrupting end of the system: background
scrim, modal radius, modal shadow, compact header, clear footer. Copy its
hierarchy when a user must stop and decide.

## Rules

- The default surface is flat: no border, no shadow. We do not outline
  everything to prove layout exists.
- The elevation tiers are exactly three: card, popover, modal.
- Component shadows belong to the primitives that own them.
- Borders are structural, especially for inputs and overlays.

## Never

- Never write a custom shadow because the composition feels flat — instead
  pick the elevation tier that matches the interaction.
- Never pair a low tier with an interrupting role or give a routine card
  modal gravity — instead match the tier to the interaction's hierarchy.
- Never borrow component shadows for layout — they belong to the primitives
  that own them; instead take layout elevation from the three tiers.
- Never use borders as decoration, especially around assistant text —
  instead use space, tone, and type hierarchy.
