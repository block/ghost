---
description: "Surface roles and the closed elevation set — gather for any card, popover, modal, dialog, scrim, or bordered container; flat is the default, borders are structural, exactly three elevation tiers."
---

Surface is the only way an element gets a background, border, radius, or
shadow. If a container needs visual treatment, it first needs a surface role.

The vocabulary is closed: role, padding, radius, border, and elevation. These
axes create enough range for page flow, cards, popovers, muted blocks,
accents, and dark moments without inventing one-off boxes.

The default surface is flat: no border, no shadow. We do not outline
everything to prove layout exists.

The elevation tiers are exactly three: card, popover, modal. Elevation
implies hierarchy — a card sits in the document flow, a popover floats above
the flow, a modal interrupts the task. Pick the tier that matches the
interaction; never write a custom shadow because the composition feels flat,
and never pair a low tier with an interrupting role or give a routine card
modal gravity. Component shadows belong to the primitives that own them;
never borrow them for layout.

Borders are structural, especially for inputs and overlays. They are not
decorative frames around ordinary text — reject borders as decoration,
especially around assistant text, and use space, tone, and type hierarchy
instead.
