---
description: "Gather before setting any radius or corner treatment. The shape dial: controls take --radius-control, surfaces take --radius-surface — this brand's current answer is pills on controls and a 20px signature radius on surfaces."
materials:
  - materials/tokens.css
  - materials/primitives.css
---

This is Vessel's answer to shape — it stands until you replace it.

The relationship is fixed: controls and surfaces carry different radius
roles, and the two never swap. Buttons and text inputs use
`--radius-control`; cards and other surfaces use `--radius-surface`.

Vessel's current answer: controls are pills (`--radius-control: 999px`) and
surfaces take the 20px signature radius (`--radius-surface: 20px`). The pill
is Vessel's most visible control signature; a rectangular button is not a
variant, it is a different design system. Never give a button the surface
radius — a rectangular button is the fastest tell that the output is not
Vessel.

20px is a considered position: rounder than default shadcn, but not bubbly.
Use the radius system as restraint, not as decoration.

To adapt: edit the `--radius-control` and `--radius-surface` values in
`materials/tokens.css` and restate this node's current answer. The
role split — one radius for what you click, one for what contains — is the
part worth keeping.
