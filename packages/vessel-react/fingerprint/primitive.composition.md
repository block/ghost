---
for: Composing layout, surfaces, text hierarchy, spacing, cards, separators, or loading states.
materials:
  - packages/vessel-react/src/components/ui/stack.tsx
  - packages/vessel-react/src/components/ui/surface.tsx
  - packages/vessel-react/src/components/ui/text.tsx
  - packages/vessel-react/src/components/ui/card.tsx
  - packages/vessel-react/src/components/ui/separator.tsx
  - packages/vessel-react/src/components/ui/skeleton.tsx
---

## Usage

Three components carry most of a screen's composure: Stack owns rhythm,
Surface owns ground, Text owns hierarchy. Reach for them before writing
layout classnames by hand. The elevation tier is the interaction statement.
Empty states, loading states, and skeletons are part of the composition,
not afterthoughts. The default temperature is quiet, and when a composition
feels flat, the fix is structure — grouping, gap contrast, tone contrast.

## Rules

- Rhythm comes from Stack's gap scale, never from margins on siblings.
- When spacing feels wrong, change the stack's gap or split into nested
  stacks with different gaps.
- Surface makes ground explicit: a semantic role, a padding step, a radius
  role, and an elevation tier, chosen together.
- Elevation tiers: `card` sits in flow, `popover` floats above it, `modal`
  interrupts.
- One shadow per compositional idea. A view that needs three shadows needs
  fewer surfaces.
- Text's variant vocabulary is the type scale: `display`, `headline`,
  `title`, `body`, `label`, `mono`, with tone carried by the `tone` prop.
- Hierarchy comes from variant and tone.
- Muted tone is the workhorse for secondary information; if everything is
  muted, nothing is.
- A skeleton mirrors the layout it replaces — same stacks, same gaps — so
  the load resolves without reflow.
- The quiet default: white ground, hairline borders, generous gaps, one
  idea per surface.

## Never

- Never patch a margin onto a child to fix spacing — that is a rhythm leak;
  change the stack's gap or split into nested stacks.
- Never use a one-off `gap-[13px]` — that is a scale violation; use Stack's
  gap scale.
- Never stack elevation on nested surfaces — one shadow per compositional
  idea.
- Never build hierarchy from ad-hoc `text-[17px]` or bolding body copy —
  use variant and tone.
- Never fix a flat composition with a decorative border, tint, or shadow —
  the fix is structure: grouping, gap contrast, tone contrast.
