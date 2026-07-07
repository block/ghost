---
description: Always read first. The non-negotiables for anything written or built for the Ghost project itself.
---

This fingerprint covers Ghost's own surfaces: the CLI output, the skill
bundle recipes, the docs site, the README, and changesets. It is Ghost
dogfooding Ghost.

The non-negotiables:

- **Plain, precise, restrained, product-minded.** Every shipped sentence
  earns its place. No brand-deck filler ("elevate", "delight", "seamless",
  "empower"), no hype, no exclamation points. See `principle.voice`.
- **The vocabulary is policed.** `scripts/check-terminology.mjs` bans the
  memory-era vocabulary and other retired terms across shipped prose,
  including this fingerprint. Use the current names: fingerprint, node, kind,
  glossary, corpus, materials, check, gather, pull, pulse, review.
- **Deterministic CLI, interpretive agent.** The CLI never calls an LLM and
  never interprets. Anything requiring reading a brand or grading a diff
  belongs to the host agent via the skill. See
  `principle.byoa-boundary`.
- **The fingerprint shape does not bend to consumers.** Flat corpus, filename
  kinds, prose bodies. Any feature that needs the artifact to change shape
  for one consumer is a leak. See `docs/purposes.md`.

Where this fingerprint is silent (visual design of the docs site, vessel's
component aesthetics), proceed from local convention and label the choice
provisional. For anything that changes the public package's shape or
vocabulary, ask a human.
