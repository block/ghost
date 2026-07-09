---
description: "Semantic color roles and the rules that govern them — gather before choosing any color; roles not raw values, status is meaning, expression is register-gated and never on controls."
materials:
  - materials/tokens.css
  - "**/*.css"
  - "**/*.html"
---

The token file is the source of truth. An agent may combine tokens, but it
may not author around them. Raw color values are implementation detail, never
product language.

Author with semantic roles: `background`, `foreground`, `card`, `popover`,
`primary`, `secondary`, `muted`, `accent`, `border`, `input`, `ring`, and the
status roles. If a container needs a color, it first needs a role.

The status roles — destructive, success, warning, info — exist only when
meaning demands them. Destructive means destructive or error. Success means
success. Warning means warning. Info means information. None of them are
brand accents, and they never moonlight as atmosphere, in any register.

One view should not perform a color palette. If a status color is present,
let the rest of the view stay on the base roles. Richness beyond this is
register-gated: a closed expression set (`--expression-*`) exists, but its
size, members, and volume ladder are a brand answer — see the palette
signature — and each register caps how loud they may be.

The constant that holds across every register: expression never touches what
you click. Buttons, inputs, and links stay on the base roles everywhere. A
colored control is a different design system.
