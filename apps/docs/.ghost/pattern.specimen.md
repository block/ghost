---
description: Gather when a reader needs to inspect an example, table, code sample, comparison, palette, diagnostic, or interactive result.
materials:
  - apps/docs/src/app/page.tsx
  - apps/docs/src/components/docs/gather-demo.tsx
  - apps/docs/src/styles/marked-doc.css
---

Use a specimen when the reader needs to inspect the thing itself rather than receive another paragraph about it.

## Anatomy

1. **Shell:** one flat outlined squircle, normally no wider than `76ch`.
2. **Caption:** annotation-colored context with `0.5rem` vertical and `2ch` horizontal inset, divided from the body by one hairline.
3. **Rows:** a bold key beside primary evidence. The key column ranges from `14ch` to `20ch`; the value column takes the remaining width. Use a `2ch` gutter and `0.625rem 2ch` row inset.
4. **Divisions:** square hairlines separate rows inside the shared squircle. Internal content does not repeat the outer radius.
5. **State:** apply the mark to the exact row or control that changed. Supporting explanations may use annotation color, but the state must remain explicit in text.

## Bound

- Let literal material remain literal: filenames look like filenames, code like code, values like values, and state labels like state labels.
- Use bold for keys, ink for primary evidence, and annotation color for captions or supporting explanation.
- Keep one shell around one inspectable object. Avoid nested cards, decorative headers, tonal lift, and shadow.
- If the specimen is interactive, state both the available choice and its result. Follow the state roles in `visual-system` and the meaning of yellow in `mark`.

## Open

- A specimen may stay within the reading column, widen to a comparison field, or become a responsive stack.
- Rows may become a single vertical flow when key and value no longer remain legible side by side.
- Related specimens may form a three-column comparison with a `1ch` gap. The group may expand to `120ch` or the viewport minus `4ch`, whichever is smaller, then collapse to one column when simultaneous comparison stops helping.
- A palette may subdivide a specimen into equal swatches, but the swatches demonstrate material; they do not introduce extra brand colors.

Width is earned when side-by-side inspection reduces cognitive work. A single short fact should not break the prose measure just to create visual variety. After a wide specimen, return the eye to the main column.
