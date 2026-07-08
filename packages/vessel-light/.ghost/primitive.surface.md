---
description: Backgrounds, borders, radius, shadow, and overlays — gather for any card, popover, modal, dialog, or scrim; the only route to elevation.
materials:
  - materials/primitives.css
  - materials/ref/composition.overlay.html
  - "**/*.html"
  - "**/*.css"
---

Surface is the only way an element gets a background, border, radius, or shadow. If a container needs visual treatment, it first needs a surface role.

The vocabulary is closed: role, padding, radius, border, and elevation. These axes create enough range for page flow, cards, popovers, muted blocks, accents, and dark moments without inventing one-off boxes.

The default surface is flat: no border, no shadow. Vessel does not outline everything to prove layout exists.

Elevation implies hierarchy. A card sits in the document flow. A popover floats above the flow. A modal interrupts the task. Do not pair a low-shadow treatment with an interrupting role or give a routine card modal gravity.

Borders are structural, especially for inputs and overlays. They are not decorative frames around ordinary text.

The overlay reference shows the interrupting end of the system: background scrim, modal radius, modal shadow, compact header, clear footer. Copy its hierarchy when a user must stop and decide.
