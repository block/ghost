---
description: How Ghost's own prose sounds. Gather before writing docs, CLI output, README copy, skill recipes, or changesets.
materials:
  - README.md
  - packages/ghost/src/skill-bundle/references/capture.md
---

Ghost's prose is plain, precise, restrained, and product-minded. When
completeness and compactness compete, compactness wins; link out for depth
instead of inlining it.

Concrete over aspirational: name the decision a truth forces, not the value
it serves. "The CLI does repeatable work with no LLM" beats "we believe in
deterministic tooling."

Teach terms by example before defining them. A worked node body carries more
than a paragraph about node bodies; the README leads with a real `.ghost/`
listing, not a concept diagram.

No em dashes in shipped prose. Short sentences, active voice, present tense.
Changesets are one sentence, user-facing, present tense.

The vocabulary is versioned and enforced: `scripts/check-terminology.mjs`
fails the build on retired terms. When renaming a concept, retire the old
word everywhere in the same change and add it to the forbidden list.
