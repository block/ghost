---
"ghost-drift": major
---

Move expression authoring (lint, describe, diff, emit review-command, emit context-bundle) into the new sibling `ghost-expression` package. `ghost-drift emit` now only handles `skill`; the moved verbs print a migration message pointing at `ghost-expression`. Library consumers can keep importing `loadExpression`, `lintExpression`, `diffExpressions`, `emitReviewCommand`, `writeContextBundle`, etc. from `ghost-drift` — those re-export from `ghost-expression` for one major-version cycle, then will be removed. Drift's skill bundle drops `profile.md`, `discover.md`, `generate.md`, and adds the new `remediate.md` recipe.
