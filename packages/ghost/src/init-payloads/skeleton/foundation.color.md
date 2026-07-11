---
description: "Color — the role system, status meanings, expression rules, and misuse; palette values are an open question. Read before choosing any color."
---

## Usage

Color is assigned by role, not by taste. The roles are the source of truth;
raw color values are implementation detail, never product language. If a
container needs a color, it first needs a role: `background`, `foreground`,
`card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `border`,
`input`, `ring`, and the status roles.

The status roles — destructive, success, warning, info — exist only when
meaning demands them. Destructive means destructive or error. Success means
success. None of them are brand accents.

One view does not perform a color palette. If a status color is present, the
rest of the view stays on the base roles. Richness beyond this comes from a
closed expression set (`--expression-*`), used at the volume the situation
allows — a marketing page may turn it up; a settings form stays quiet.

## Palette

Open — ask the human; do not freehand. The fixed relationship: a quiet base
spine is the default atmosphere in every medium, and a closed expression set
supplies the rest, its volume set by situation, never by taste. The open
question: what is this brand's base spine, and what are the named hues of
its expression set — how many, and which? When the human answers, restate
this section as the brand's current answer and record the values where your
materials live. Until then, proceed with a quiet provisional spine and label
it provisional.

## Misuse

- Status colors never moonlight as atmosphere, in any context.
- Expression never touches what you click. Buttons, inputs, and links stay
  on the base roles everywhere. A colored control is a different design
  system.
- No one-off hex values. If a color has no role, it has no place.
