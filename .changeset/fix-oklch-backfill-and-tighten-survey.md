---
"ghost-expression": patch
"ghost-drift": patch
---

Fix self-distance bug + tighten the survey recipe's exhaustiveness rule.

**Bug fix.** `loadExpression` now backfills `oklch` on palette colors that arrive hex-only (frontmatter without an explicit `oklch` tuple). Without this, `comparePalette` treated hex-only colors as fully unmatched and contributed distance `1.0` per color — even when comparing an expression to itself. Self-distance was reported as 17.5% on a freshly authored expression. Backfill is deterministic (same hex → same oklch), so re-parsing the same file always yields the same in-memory shape.

**Defensive fallback.** `comparePalette` also now resolves oklch on-the-fly when missing, and falls back to hex-string equality when even on-the-fly compute can't parse the color (CSS variables, opaque external refs). This covers third-party producers that don't backfill on write.

**Recipe tightening.** `survey.md` now states the exhaustiveness rule up front and applies it per section. The rule is repo-agnostic — the recipe doesn't name specific signal sources (no "use registry.json"); the agent identifies the canonical signal in *this* repo, enumerates exhaustively, and cross-checks counts. New `Never sample` rule and explicit guidance against placeholder/glob library names. Triggered by a dogfood scan that produced ~10% recall on `components[]` (6 rows for a 97-component package).
