---
for: Laying out any view.
materials:
  - materials/primitives.css
---

## Usage

All layout is stacks. Rhythm comes from relationships between siblings, not
from isolated margins pasted onto whichever element was last touched.

Choose the gap that states the relationship. Ad-hoc margins between siblings
are forbidden because they hide the rhythm. When spacing feels wrong, change
the stack gap or split the stack.

Columns are for almost everything: forms, cards, message lists, modal bodies,
settings, empty states, and page sections. A column lets the user scan.

Rows are conditional. Use them for controls, metadata lines, compact status,
and paired label/value moments. If a row starts wrapping awkwardly, it
probably wanted to be a column.

## Rules

- The gap steps are exactly five: `--gap-xs`, `--gap-sm`, `--gap-md`,
  `--gap-lg`, `--gap-xl`.
- The default is column, medium gap, stretch alignment, start justification.
  That is the ordinary reading rhythm.
- Rows are for controls, metadata lines, compact status, and paired
  label/value moments.

## Never

- Never place ad-hoc margins between siblings — they hide the rhythm;
  instead change the stack gap or split the stack.
- Never tune by single pixels to make a screenshot pass — instead choose the
  gap step that states the relationship.
- Never keep a row that starts wrapping awkwardly — it probably wanted to be
  a column; instead convert it.
