---
"ghost-expression": major
---

Drop the `# Signature` body section and `observation.distinctiveTraits` field from the `expression.md` schema. Every claim Signature carried — distinctive traits, load-bearing absences — was already covered better elsewhere: `rules[]` with `presence_floor` codifies absences as enforceable patterns, decisions cite evidence directly, and `observation.personality` carries the lightweight summarizing role. Signature had collapsed into restating frontmatter as bullets.

The parser silently ignores legacy `# Signature` blocks in older `expression.md` files, so existing artifacts continue to load without erroring. The writer no longer emits the section, and lint no longer expects it. `INVARIANTS.md` §3 has been amended to remove "Signature" from the body partition list.

Removed: `DesignObservation.distinctiveTraits` (TypeScript), `# Signature` body section, `observation.distinctiveTraits` field. Context-bundle emit now uses `observation.personality` for the trait-phrase hooks in README and skill description.
