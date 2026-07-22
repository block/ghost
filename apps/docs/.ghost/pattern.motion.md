---
description: Gather when anything moves, transitions, reveals in sequence, or changes position or emphasis.
materials:
  - apps/docs/src/components/docs/gather-demo.tsx
  - apps/docs/src/styles/marked-doc.css
---

Motion must leave the reader with more evidence than they had before it began. The current expression has no shared duration or easing scale, so do not infer one from an incidental component interval or framework default.

Reveal a sequence when order matters. Change emphasis when a choice has been made. Move an element only when its new position explains a structural change. Prefer short, direct transitions without spring, bounce, drift, or theatrical easing.

The static composition must remain complete. Under `prefers-reduced-motion`, reveal the final state immediately and preserve every distinction through text, weight, border, or color.

**Do:** reveal selected and skipped rows in reading order after a person chooses a task.

**Don't:** animate rules, headings, backgrounds, or decorative geometry to keep a quiet surface in motion.
