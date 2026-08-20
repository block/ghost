---
for: Choosing or applying color.
---

Starter guidance the brand owner has not yet reviewed. Cite it as provisional
until a human edits or confirms this chapter.

## Usage

Color is assigned by role, not by taste. The roles are the source of truth;
raw color values are implementation detail, never product language. If a
container needs a color, it first needs a role. Richness beyond the base
spine comes from a closed expression set, used at the volume the situation
allows — a marketing page may turn it up; a settings form stays quiet.

The status roles exist only when meaning demands them. None of them are
brand accents.

## Rules

- Every colored element uses a named role: `background`, `foreground`,
  `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `border`,
  `input`, `ring`, or a status role.
- Status roles carry their meaning exactly: destructive means destructive or
  error, success means success, warning warns, info informs.
- When a status color is present, the rest of the view stays on the base
  roles. One view does not perform a color palette.
- Expression color comes only from the closed `--expression-*` set, at the
  volume the situation allows.
- Known gap — the palette is unanswered. The fixed relationship: a quiet
  base spine is the default atmosphere in every medium, and a closed
  expression set supplies the rest, its volume set by situation, never by
  taste. The open question: what is this brand's base spine, and what are
  the named hues of its expression set — how many, and which? Ask the human;
  do not invent values. Until answered, proceed with a quiet provisional
  spine and label it provisional. When answered, restate this rule as the
  brand's current answer and record the values where your materials live.

## Never

- Never use status colors as atmosphere, in any context — status color
  appears only where its meaning applies.
- Never put expression color on what you click. Buttons, inputs, and links
  stay on the base roles everywhere; a colored control is a different design
  system.
- Never use a one-off hex value — if a color has no role, it has no place;
  give it a role or delete it.
