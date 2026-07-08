---
description: Stack, Surface, and Text — rhythm from the gap scale, elevation as interaction tiers, type from the variant vocabulary.
materials:
  - "**/components/ui/stack.tsx"
  - "**/components/ui/surface.tsx"
  - "**/components/ui/text.tsx"
  - "**/components/ui/card.tsx"
  - "**/components/ui/separator.tsx"
  - "**/components/ui/skeleton.tsx"
---

Three components carry most of a screen's composure: Stack owns rhythm,
Surface owns ground, Text owns hierarchy. Reach for them before writing
layout classnames by hand.

Rhythm comes from Stack's gap scale, never from margins on siblings. When
spacing feels wrong, change the stack's gap or split into nested stacks with
different gaps — a margin patched onto a child is a rhythm leak, and a
one-off `gap-[13px]` is a scale violation.

Surface makes ground explicit: a semantic role, a padding step, a radius
role, and an elevation tier, chosen together. The elevation tier is the
interaction statement — `card` sits in flow, `popover` floats above it,
`modal` interrupts. Do not stack elevation on nested surfaces; one shadow
per compositional idea. A view that needs three shadows needs fewer
surfaces.

Text's variant vocabulary is the type scale: `display`, `headline`, `title`,
`body`, `label`, `mono`, with tone carried by the `tone` prop. Hierarchy
comes from variant and tone, not from ad-hoc `text-[17px]` or bolding body
copy. Muted tone is the workhorse for secondary information; if everything
is muted, nothing is.

Empty states, loading states, and skeletons are part of the composition, not
afterthoughts. A skeleton mirrors the layout it replaces — same stacks, same
gaps — so the load resolves without reflow.

The default temperature is quiet: white ground, hairline borders, generous
gaps, one idea per surface. When a composition feels flat, the fix is
structure — grouping, gap contrast, tone contrast — never a decorative
border, tint, or shadow.
