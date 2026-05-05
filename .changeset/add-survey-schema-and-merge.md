---
"ghost-expression": minor
---

Land the three-stage scan pipeline: map (`map.md`) → survey (`survey.json`) → express (`expression.md`). All three stages are now owned by `ghost-expression`; the previously separate `ghost-map` package is folded in.

**New artifact: `ghost.survey/v1`** — catalogues every concrete design value with structured specs, occurrence counts, and deterministic content-hashed IDs.

**New verbs:**
- `ghost-expression inventory [path]` — emit deterministic raw repo signals as JSON (manifests, language histogram, registry, top-level tree, git remote). Feeds the topology recipe. (Migrated from `ghost-map inventory`.)
- `ghost-expression survey <op>` — `merge` (concat with id-based dedup, idempotent — useful for modular rollups and fleet cohort views), `fix-ids` (recompute every row's `id` from content, so surveyor agents can author rows with empty `id` fields and finalize in one pass).
- `ghost-expression scan-status [dir]` — report which scan stages have produced artifacts (`map.md`, `survey.json`, `expression.md`) and which stage to run next. The build-system glue orchestrators call between stages.

**Updated verbs:**
- `ghost-expression lint` now auto-detects file kind by extension/content and dispatches to the right validator (`expression.md`, `map.md`, or `survey.json`).

**New skill recipes:**
- `map.md` — author `map.md` from a target (the topology stage). Migrated from the standalone `ghost-map` package.
- `survey.md` — author `survey.json` from a target (the observed evidence stage). Walks the agent through LLM-driven extraction with dialect-specific grep strategies, exhaustiveness discipline, and saturation predicate.
- `scan.md` — meta-recipe that orchestrates map → survey → profile end-to-end via `scan-status` checkpoints. Use when the user wants a full scan rather than a specific stage.

**Refactored skill recipe:**
- `profile.md` — now strictly the expression stage. Reads `survey.json` as ground truth; cannot fabricate values not in the survey; cites survey rows as evidence. Pre-requires `map.md` + `survey.json`. Hard split from the previous one-pass extract+interpret recipe.

**Removed:** the `ghost-map` package is deleted. `ghost.map/v1` schema and types now live in `@ghost/core`; `inventory` and `lint` (for `map.md`) move to `ghost-expression`. Consumers that imported from `ghost-map` should switch to `@ghost/core` (schemas/types) or `ghost-expression` (CLI verbs / library functions).

Survey schema, deterministic-id generation, lint, merge, and fix-ids primitives live in `@ghost/core`.
