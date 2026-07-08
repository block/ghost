---
description: Use semantic monochrome tokens, status-only utility colors, three elevation tiers, pill controls, and the signature 20px card radius.
materials:
  - materials/tokens.css
  - "**/*.css"
  - "**/*.html"
---

The token file is the source of truth. An agent may combine tokens, but it may not author around them.

The base palette is monochrome gray. That is the default atmosphere of Vessel: calm, legible, and resistant to novelty.

Author with semantic roles: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `border`, `input`, `ring`, and the status roles. Raw hex values are implementation detail, never product language.

Red, green, yellow, and blue exist only when meaning demands them. Red means destructive or error. Green means success. Yellow means warning. Blue means information. None of them are brand accents.

One view should not perform a color palette. If a status color is present, let the rest of the view stay gray. Richness beyond this is register-gated: the expression palette exists, but its volume ladder lives in the expression node — in product UI it appears only inside charts.

Elevation on surfaces is three tiers: card (sits in flow), popover (floats above the flow), modal (interrupts the task). Pick the tier that matches the interaction; never write a custom `box-shadow` because the composition feels flat. Component shadows (`--shadow-btn`, `--shadow-mini`, `--shadow-kbd`) belong to the primitives that own them; never borrow them for layout.

Controls are pills. Buttons and text inputs use `--radius-pill` (999px); cards use the 20px signature radius. Never give a button the card radius — a rectangular button is the fastest tell that the output is not Vessel.

`--radius: 20px` is a signature. Vessel is rounder than default shadcn, but not bubbly. Use the radius system as restraint, not as decoration.
