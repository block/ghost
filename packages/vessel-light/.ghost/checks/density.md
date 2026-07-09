---
name: Density and token discipline
description: Flags decorative color, raw values, and invented shadows that break Vessel's monochrome-first token contract and register expression budgets.
severity: high
references:
  - anti-goal.median
  - grammar.color-roles
  - grammar.surfaces
  - grammar.rhythm
  - grammar.hierarchy
  - signature.palette
  - signature.shape
---

Review changed HTML and CSS by view, not just by file.

Classify the register of each changed view first: table layout, `bgcolor`, or a 600px wrapper means email; display-scale headings, `--section-padding-vertical`, or `--surface-dark-*` means editorial; compressed 4/8px gaps with mono numerals means data-density; otherwise product.

Count distinct non-gray colors visible in each view, then judge against that register's expression budget: product views get one functional accent, with expression hues permitted only inside chart or visualization markup; data consoles get one status hue family, with the same chart carve-out inside the plot area; email gets one expressive moment in one hue; editorial pages get at most two expression hues. Flag anything over budget, and flag expression hues used atmospherically outside their register. Status colors count toward the total unless the view compares two or more distinct statuses side by side (for example a status column).

Flag any color that is neither a gray, a status token, nor one of the five expression hues (`--expression-1` through `--expression-5`, or their hex values in email). Invented hues are drift in every register.

Flag expression hues on buttons, inputs, or links in every register. Controls stay monochrome; no budget covers them.

Flag raw hex, rgb, hsl, or named color values in changed CSS or inline styles when a Vessel token could express the same role. The authoring vocabulary is semantic tokens, not literal color. Exception: email files — hardcoded values transcribed from tokens are the contract there; flag only values that correspond to no token and no expression hue.

Flag `box-shadow` values that do not use the elevation tier variables (`--shadow-card`, `--shadow-popover`, `--shadow-modal`) or the component shadows owned by a primitive (`--shadow-btn`, `--shadow-mini`, `--shadow-kbd`). Do not accept a custom shadow because it is visually close.

Flag buttons or text inputs that are not pill-radius. A rectangular control is a token violation, not a style choice.

Flag more than one primary-variant button per view. Secondary actions step down to secondary, outline, ghost, or link.

Flag `margin` set on siblings inside a stack in changed CSS or inline styles. Rhythm comes from the gap scale; recommend changing the stack gap or splitting the stack.

Flag borders, fills, gradients, glass effects, or colored accents used to make ordinary structure feel designed. Recommend semantic surfaces, stack spacing, text tone, or the existing elevation tier instead.
