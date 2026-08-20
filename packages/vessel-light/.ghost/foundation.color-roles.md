---
for: Choosing or applying color.
materials:
  - materials/tokens.css
---

## Usage

The token file is the source of truth. An agent may combine tokens, but it
may not author around them. Raw color values are implementation detail, never
product language.

If a container needs a color, it first needs a role. The status roles —
destructive, success, warning, info — exist only when meaning demands them.
None of them are brand accents.

One view should not perform a color palette. If a status color is present,
let the rest of the view stay on the base roles. Richness beyond this is
context-gated: a closed expression set (`--expression-*`) exists, but its
size, members, and volume ladder are a brand answer — see the palette
foundation — and each context caps how loud they may be.

## Rules

- Author with semantic roles: `background`, `foreground`, `card`, `popover`,
  `primary`, `secondary`, `muted`, `border`, `input`, `ring`, and the status
  roles.
- Destructive means destructive or error. Success means success. Warning
  means warning. Info means information.
- The constant that holds across every context: expression never touches
  what you click. Buttons, inputs, and links stay on the base roles
  everywhere.

## Never

- Never let a status role moonlight as atmosphere, in any context — status
  colors keep their meanings everywhere; use the expression set at the
  context's sanctioned volume instead.
- Never author around the tokens with raw color values — combine tokens.
- Never put a color on a colored control — a colored control is a different
  design system; controls stay on the base roles.
