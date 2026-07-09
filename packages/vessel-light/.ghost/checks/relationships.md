---
name: Relationship discipline
description: Flags structural violations of the grammar — emphasis-ladder breaks, sibling margins, decorative borders, nested cards. These rules survive any adaptation.
severity: high
references:
  - grammar.hierarchy
  - grammar.rhythm
  - grammar.surfaces
  - anti-goal.median
---

These assertions test relationships between token roles, not the values behind
them. They hold for any brand built on this grammar; an adapted package keeps this check
unchanged.

Flag more than one primary-variant button per view. Secondary actions step
down the emphasis ladder: secondary, outline, ghost, or link.

Flag `margin` set on siblings inside a stack in changed CSS or inline styles.
Rhythm comes from the gap scale; recommend changing the stack gap or splitting
the stack.

Flag borders, fills, gradients, glass effects, or colored accents used to make
ordinary structure feel designed. Recommend semantic surfaces, stack spacing,
text tone, or the existing elevation tier instead.

Flag card-like surfaces nested inside card-like surfaces. One surface level
per region; interior hierarchy comes from spacing and type, not another
container.

Flag `box-shadow` values that belong to no declared elevation tier and no
component-owned shadow. Do not accept a custom shadow because it is visually
close to a tier — elevation is a closed set, whatever the values are.
