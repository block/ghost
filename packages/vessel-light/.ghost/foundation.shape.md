---
for: Choosing or implementing any radius or corner treatment.
materials:
  - materials/tokens.css
  - materials/primitives.css
---

## Usage

This is Vessel's answer to shape — it stands until you replace it.

The relationship is fixed: controls and surfaces carry different radius
roles, and the two never swap. The pill is Vessel's most visible control
signature; a rectangular button is not a variant, it is a different design
system.

20px is a considered position: rounder than default shadcn, but not bubbly.
Use the radius system as restraint, not as decoration.

To adapt: edit the `--radius-control` and `--radius-surface` values in
`materials/tokens.css` and restate this node's current answer. The
role split — one radius for what you click, one for what contains — is the
part worth keeping.

## Rules

- Buttons and text inputs use `--radius-control`; cards and other surfaces
  use `--radius-surface`.
- Controls are pills (`--radius-control: 999px`).
- Surfaces take the 20px signature radius (`--radius-surface: 20px`).

## Never

- Never give a button the surface radius — a rectangular button is the
  fastest tell that the output is not Vessel; instead controls take
  `--radius-control`, the pill.
- Never swap the two radius roles — instead keep `--radius-control` on what
  you click and `--radius-surface` on what contains.
- Never use the radius system as decoration — instead use it as restraint.
