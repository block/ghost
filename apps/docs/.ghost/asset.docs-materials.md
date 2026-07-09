---
description: Concrete docs-site materials — inspect before inventing tokens, components, typography, navigation, motion, routes, or command examples.
materials:
  - apps/docs/src/App.tsx
  - apps/docs/src/main.tsx
  - apps/docs/src/styles/dev-fonts.css
  - apps/docs/src/components/docs/**
  - apps/docs/src/app/**/*.tsx
  - apps/docs/src/content/docs/*.mdx
  - apps/docs/src/generated/cli-manifest.json
  - packages/vessel-react/src/styles/main.css
  - packages/vessel-react/src/components/**
---

Do not invent docs-site vocabulary before inspecting the materials already in
place.

Material contract:

- **Tokens and primitives** come from `@design-intelligence/vessel-react/styles.css`,
  backed by `packages/vessel-react/src/styles/main.css`. Author with semantic roles
  (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-card`) and the named docs typography variables (`--heading-*`,
  `--label-*`). Avoid raw palette utilities unless they are already part of a
  documented semantic exception.
- **Fonts** are overridden for the docs dev surface in
  `apps/docs/src/styles/dev-fonts.css`; `font-display` and `font-sans` resolve to
  Cash Sans locally. Preserve the uppercase label and black display-type rhythm.
- **Navigation** is the bottom floating `Dock`. New top nav, side nav, or
  secondary persistent chrome should be treated as a product decision, not a
  routine addition.
- **Page structure** lives in `AnimatedPageHeader`, `SectionWrapper`,
  `DocsPageLayout`, `DocSection`, and `DocProse`. Use these before making a new
  layout primitive.
- **Docs content** is MDX under `apps/docs/src/content/docs/` with frontmatter
  wired through the docs manifest and routes. Do not hard-code a one-off article
  route unless the content model cannot express it.
- **CLI examples** should be checked against `apps/docs/src/generated/cli-manifest.json`
  or regenerated with `pnpm dump:cli-help` after CLI command/flag changes.

The materials locate facts; this node does not make every existing choice a
brand truth. If a component repeats a weak or legacy pattern, fix the pattern
instead of canonizing it here.
