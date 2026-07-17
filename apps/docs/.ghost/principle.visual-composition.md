---
description: Visual composition floor for the docs site — gather before changing landing pages, headers, cards, navigation, motion, or layout rhythm.
materials:
  - apps/docs/src/app/page.tsx
  - apps/docs/src/app/docs/page.tsx
  - apps/docs/src/app/tools/**/*.tsx
  - apps/docs/src/components/docs/**
  - packages/vessel-react/src/styles/main.css
---

The ghost docs site should render like a stark technical artifact with one
controlled spectral move, not a generic docs template.

Hard floor:

- **Monochrome carries authority.** Default to background, foreground, muted,
  border, and card roles. Color is rare and semantic; never invent a product
  accent for excitement.
- **Typography is the hero.** Large display type, tight tracking, uppercase
  kickers, and generous line-height do most of the branding. If a page needs
  impact, increase type hierarchy or negative space before adding illustration.
- **One memorable visual gesture per surface.** The landing page can have the
  concentric ghost rings. A docs index can have card underlines. A prose page can
  have sticky section labels. Do not stack rings, gradients, decorative blobs,
  screenshots, and animated cards on the same surface.
- **Flat before elevated.** Reach for whitespace, alignment, rule lines, and
  border-card before shadows or heavy containers. The floating dock is the main
  elevated object; new elevation must earn its presence.
- **Motion reveals structure.** Use motion to stage reading order or clarify a
  state change. Avoid ambient decoration, bounce, springiness, or motion that
  competes with the text.
- **Density is editorial.** Docs pages should feel sparse at the frame level but
  precise inside the prose. Long text belongs in the MDX article system; landing
  pages should have short thesis blocks and strong scannable routes.

When a pattern conflicts with this floor, the floor wins and the pattern is
wrong. When Vessel tokens make a choice available but this floor rejects the
output, choose the docs package.
