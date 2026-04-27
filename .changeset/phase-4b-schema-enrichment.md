---
"ghost-expression": minor
---

`expression.md`: `surfaces.shadowComplexity` enum value `none` is renamed to `deliberate-none` so the choice reads as a positive design stance rather than as "we forgot." The `unused-palette` lint now also counts hex citations in `roles[]` (palette field bindings + inline references in `evidence` strings), so role-bound colors no longer require name-dropping in decision prose.

The `none` → `deliberate-none` change is breaking for any `expression.md` setting `shadowComplexity: none`. `ghost-expression` is pre-1.0 and not yet published, so no major bump; existing files should update their value.
