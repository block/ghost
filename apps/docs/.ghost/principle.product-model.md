---
description: Core ghost product model — gather for docs copy, IA, onboarding, diagrams, workflow explanations, or any statement of what ghost is.
materials:
  - apps/docs/src/app/page.tsx
  - apps/docs/src/content/docs/getting-started.mdx
  - apps/docs/src/content/docs/authoring.mdx
  - apps/docs/src/content/docs/checks-and-review.mdx
  - packages/ghost/src/commands/**
---

ghost is a small deterministic layer around an interpretive human-agent loop.
The docs should keep that model crisp:

- **Feed-forward first.** ghost helps the agent read the right repo-local brand
  guidance before it builds. Review is useful, but it is the second half of the
  loop, not the headline.
- **BYOA, not an autonomous designer.** The host agent reads, selects, writes,
  and judges. The CLI performs repeatable work: scaffold, validate, gather the
  menu, pull selected nodes, summarize local events, and assemble advisory
  review packets.
- **Flat node corpus.** A ghost package is a flat `.ghost/` package of markdown
  prose nodes. Kinds come from filename prefixes declared in `glossary.md`.
  Altitude lives in prose; narrower guidance names their condition. Do not describe
  folders, inheritance, edge traversal, or schema fields as the conceptual model.
- **Prose is executable context only through use.** A node steers because an
  agent can find it, read it, and manifest it. Keep retrieval handles and command
  examples close to abstract claims.
- **Git is the approval boundary.** Uncommitted ghost package edits are drafts;
  checked-in node prose is canonical through normal review.

When the docs must choose between theoretical completeness and a simple first
win, the first win wins. The canonical onboarding story is: write the decision
you keep repeating once, put it in `.ghost/`, gather it before generation, and
review drift after the diff.
