---
description: "Global rule for the yellow mark: it records selection, intervention, or active choice and never acts as general decoration."
materials:
  - apps/docs/src/styles/marked-doc.css
  - apps/docs/src/components/docs/gather-demo.tsx
---

Yellow behaves like a highlighter touching the document. It appears where a person or system has selected, picked, or actively changed something.

Use the full mark for committed state: selected text, a pressed choice, or a picked row. Use the soft mark only as a preview of that same action, such as hover. Keep ordinary titles, links, rules, diagrams, and large background fields in the neutral system.

The mark must remain scarce enough that each occurrence reads as evidence of an action. If yellow can be removed without losing state meaning, its use was decorative.

**Do:** mark the exact row or control whose state changed.

**Don't:** use yellow to make a hero louder, color an arbitrary keyword, fill an illustration, or establish a second background theme.
