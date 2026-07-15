---
description: Docs and tool index card grids — use for /docs, /tools, and per-tool landing pages that route users to a small set of next reads.
materials:
  - apps/docs/src/app/docs/page.tsx
  - apps/docs/src/app/tools/page.tsx
  - apps/docs/src/app/tools/scan/page.tsx
  - apps/docs/src/app/tools/drift/page.tsx
  - apps/docs/src/components/docs/animated-page-header.tsx
---

This pattern applies when a page is a routing surface: it names a section of the
product and offers a small set of next reads or tools.

**Bound:**

- Start with `AnimatedPageHeader`: kicker, blunt title, one sentence of routing
  context, and the short horizontal rule.
- Use a low-count grid. Two or three columns are enough; if the page needs more
  than five cards, reconsider the information architecture before adding visual
  density.
- Cards stay quiet by default: border-card, card background, muted icon, compact
  title, one short description. The hover state can darken the border and invert
  a title underline, but it should not become a whole animated tile.
- Card copy explains the job of the destination, not the feature in abstract.
  Prefer "Emit Available guidance with gather" over "Powerful context
  discovery."
- Icons are thin-line Lucide symbols at the existing sizes and stroke widths.
  They support scanning; they are not illustrations.

**Open:**

- Grid cardinality and card ordering may change with the docs IA.
- The exact icon can change when it makes the destination easier to recognize.
- A tool page may use a tighter chip strip instead of large cards when the
  choices are secondary.

**Refines:** `principle.visual-composition` and `voice.docs-language`. If a
proposed card grid needs bright accents, screenshots, badges, or paragraph-long
blurbs to feel useful, the content structure is wrong.
