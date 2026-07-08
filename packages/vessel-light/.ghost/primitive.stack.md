---
description: Compose layout with stack direction, gap, alignment, justification, and wrap; never ad-hoc sibling margins.
materials:
  - materials/primitives.css
  - "**/*.html"
  - "**/*.css"
---

All layout is stacks. Vessel rhythm comes from relationships between siblings, not from isolated margins pasted onto whichever element was last touched.

The gap scale is the spacing language: 4, 8, 16, 24, and 32. Choose the gap that states the relationship. Do not tune by single pixels to make a screenshot pass.

The default is column, medium gap, stretch alignment, start justification. That is Vessel's ordinary reading rhythm.

Columns are for almost everything: forms, cards, message lists, modal bodies, settings, empty states, and page sections. A column lets the user scan.

Rows are conditional. Use them for controls, metadata lines, compact status, and paired label/value moments. If a row starts wrapping awkwardly, it probably wanted to be a column.

Ad-hoc margins between siblings are forbidden because they hide the rhythm. When spacing feels wrong, change the stack gap or split the stack.
