---
description: Global composition model for margin, reading column, wider evidence, responsive collapse, and active empty space.
materials:
  - apps/docs/src/components/docs/docs-page-layout.tsx
  - apps/docs/src/components/docs/wrappers.tsx
  - apps/docs/src/styles/marked-doc.css
  - apps/docs/src/app/page.tsx
---

The main reading path is column-oriented and anchored to one side rather than centered in the viewport.

- Put a compact title, number, state, or annotation in the margin and the explanation in one adjacent reading column.
- Keep prose narrow enough to read as a continuous argument. The reference measure is `54ch`; do not expand body text because more width is available.
- Divide major steps with hairline rules and substantial vertical space. Rules reveal sequence; whitespace gives each step its own field.
- Let richer content extend beyond the reading column when simultaneous comparison, code legibility, a diagram, or dense evidence requires room. After it, return the eye to the column.
- On compact screens, move marginal information above the content and retain its sequence or role. Do not compress both columns until neither reads well.
- Leave unused space empty. It does not require visual balance through ornament, navigation, or a second content rail.

The recognizable reading path is: margin identifies, column explains, wider material proves, then the eye returns to the column.
