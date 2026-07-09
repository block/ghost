---
description: "Layout rhythm — all layout is stacks with a closed gap step set; gather before laying anything out; never ad-hoc sibling margins."
materials:
  - materials/primitives.css
  - "**/*.html"
  - "**/*.css"
---

All layout is stacks. Rhythm comes from relationships between siblings, not
from isolated margins pasted onto whichever element was last touched.

The gap steps are exactly five: `--gap-xs`, `--gap-sm`, `--gap-md`,
`--gap-lg`, `--gap-xl`. Choose the gap that states the relationship. Do not
tune by single pixels to make a screenshot pass.

The default is column, medium gap, stretch alignment, start justification.
That is the ordinary reading rhythm.

Columns are for almost everything: forms, cards, message lists, modal bodies,
settings, empty states, and page sections. A column lets the user scan.

Rows are conditional. Use them for controls, metadata lines, compact status,
and paired label/value moments. If a row starts wrapping awkwardly, it
probably wanted to be a column.

Ad-hoc margins between siblings are forbidden because they hide the rhythm.
When spacing feels wrong, change the stack gap or split the stack.
