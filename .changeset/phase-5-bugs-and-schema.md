---
"ghost-expression": minor
---

Phase 5 fixes and schema widening for real-world repo variety.

Bug fixes (5a):

- Skill-bundle `schema.md` and `profile.md`: `decisions[].evidence` belongs in the body under `**Evidence:**` bullets, not as a frontmatter array. The condensed reference the LLM loads still showed the old shape; agents following the profile recipe were hitting 10 schema errors on first lint.
- `unused-palette` now propagates slug-bindings: `roles[].tokens.palette.<slot>` referencing `{palette.dominant.X}` marks the underlying hex as cited. Phase 4b claimed this; the code only matched literal hexes.

Schema widenings (5b):

- `roles[].tokens.palette` is now an open record (`Record<string, string>`) instead of a fixed three-key object. Conventional vocabulary (`background`, `foreground`, `surface`, `border`, `accent`, `muted`, `link`) is documented in the schema reference and `expression-format.md`; richer slot names (`ring`, `popover`, `separator`, …) no longer hard-error.
- `broken-role-reference` accepts opaque external token refs (`{base.color.brand.x}`, `{semantic.text.on-brand}`, …) without trying to resolve them. Style-Dictionary-style consumer expressions can now bind role slots to upstream tokens without the linter rejecting them.
