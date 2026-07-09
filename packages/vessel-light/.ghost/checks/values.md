---
name: Value discipline
description: Flags off-signature values — non-pill controls, off-palette hues, raw color literals, expression over budget. Adapting the dials rewrites this check alongside the signature nodes.
severity: high
references:
  - signature.shape
  - signature.palette
  - grammar.color-roles
  - register.data-density
  - register.editorial
  - register.email
---

These assertions test Vessel's current answers to the signature dials. A
adaptation that changes the dials rewrites this check with them; the paired
relationship check stays.

Review changed HTML and CSS by view, not just by file. Classify the register
of each changed view first: table layout, `bgcolor`, or a 600px wrapper means
email; display-scale headings, `--section-padding-vertical`, or
`--surface-dark-*` means editorial; compressed smallest-gap-step layouts with
mono numerals means data-density; otherwise product.

Flag buttons or text inputs that are not pill-radius (`--radius-control`).
A rectangular control is a token violation, not a style choice.

Flag surfaces that carry a radius other than `--radius-surface`, and radius
roles swapped across the boundary: control radius on a surface, surface
radius on a control.

Count distinct non-gray colors visible in each view, then judge against that
register's expression budget: product views get one functional accent, with
expression hues permitted only inside chart or visualization markup; data
consoles get one status hue family with the same chart carve-out; email gets
one expressive moment in one hue; editorial pages get at most two expression
hues. Flag anything over budget, and flag expression hues used
atmospherically outside their register. Status colors count toward the total
unless the view compares two or more distinct statuses side by side.

Flag any color that is neither a gray, a status token, nor one of the five
expression hues (`--expression-1` through `--expression-5`, or their hex
values in email). Invented hues are drift in every register.

Flag expression hues on buttons, inputs, or links in every register. Controls
stay monochrome; no budget covers them.

Flag raw hex, rgb, hsl, or named color values in changed CSS or inline styles
when a Vessel token could express the same role. The authoring vocabulary is
semantic tokens, not literal color. Exception: email files — hardcoded values
transcribed from tokens are the contract there; flag only values that
correspond to no token and no expression hue.
