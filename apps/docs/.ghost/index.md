---
description: Always read first for docs-site work — non-negotiables, coverage, and silence posture for the ghost docs surface.
materials:
  - apps/docs/src/app/page.tsx
  - apps/docs/src/content/docs/*.mdx
  - apps/docs/src/components/docs/**
---

This ghost package governs the ghost docs site: the landing page, documentation
index, tool landings, MDX docs pages, and the small components that carry them.
It does not govern Vessel as a reference component registry; Vessel has its own
ghost package under `packages/vessel-react/.ghost/`. When the docs consume Vessel
materials, this package decides the docs' product stance and Vessel decides
the component-system contract.

## Non-negotiables

- ghost is **brand context for agents**, not a component library, lifecycle
  manager, design archive, or autonomous judge. Keep the docs centered on the
  feed-forward act: the agent reads repo-local brand guidance before it builds.
- Preserve the flat corpus model: `.ghost/` is a package of prose nodes;
  `manifest.yml`, `glossary.md`, and `checks/` are reserved; everything else is
  a node whose id comes from its filename. No hierarchy, inheritance, graph, or
  edge language.
- The page should feel like a serious tool, not a SaaS explainer template:
  monochrome, restrained, typographic, with precise motion and only one
  memorable visual gesture at a time.
- Concrete command names matter. Use `ghost init`, `ghost validate`,
  `ghost gather`, `ghost pull`, `ghost pulse`, `ghost checks init`, and
  `ghost review` exactly unless the CLI changes and the generated manifest has
  been updated.
- Do not let optional review language obscure the boundary: checks and review
  are feed-back, advisory, and never generation input.

## How to read the corpus

Read `principle.product-model`, `principle.visual-composition`, and
`voice.docs-language` for broad docs work. Pull `asset.docs-materials` before
changing UI, tokens, routes, MDX layouts, or command examples. Pull
`pattern.docs-index-card-grid` for card-index pages and `pattern.doc-article`
for MDX documentation pages. Pull `anti-goal.generated-docs-site` before any new
visual or marketing surface.

The `decision.*` nodes explain tradeoffs; they are not permanent rules unless a
principle or pattern repeats them. `exemplar.*` nodes show how an existing page
pulls off the stance; match the annotated qualities, not every literal detail.

## Silence posture

When this package is silent, proceed provisionally from nearby docs pages and
Vessel's token/component contract for routine implementation. Ask before
changing product model vocabulary, introducing new visual metaphors, adding a new
agent workflow, or making the docs sound more like marketing than instruction.
