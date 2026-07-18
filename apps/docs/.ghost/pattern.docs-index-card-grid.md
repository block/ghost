---
description: Docs index rows — use for /docs and other routing pages that point users to a small set of next reads.
materials:
  - apps/docs/src/app/docs/page.tsx
  - apps/docs/src/components/docs/doc-index.tsx
  - apps/docs/src/components/docs/page-header.tsx
---

This pattern applies when a page routes readers to a small set of next steps.

**Bound:**

- Start with `PageHeader`: a blunt title and only the description needed to
  orient the reader.
- Use low-count `DocIndex` rows with numbered names and one short description.
- Route copy explains what the reader can do at the destination. Prefer "Exact
  commands, flags, outputs, and exit behavior" over feature language.
- Keep rows typographic. Do not add icons, screenshots, badges, or decorative
  cards to make a short index feel fuller.

**Open:**

- Row count and ordering may change with the docs IA.
- Sections may split the index when they reflect a real difference in reader
  intent, such as learning versus reference.

**Refines:** `principle.visual-composition` and `voice.docs-language`. If the
index needs ornament or paragraph-long descriptions to feel useful, improve the
information structure.
