# Attempt 2 — ghost-ui scan, 2026-04-29 (post-tighten)

Second dogfood after the survey-recipe tightening (commit `916e728`) and the oklch backfill bug fix. Same target as attempt 1 (`packages/ghost-ui`).

## Recall delta vs attempt 1

| Section | Attempt 1 | Attempt 2 | Reality |
|---|---|---|---|
| `values[]` | 22 | 190 | ~190 (136 distinct hex + 41 distinct spacing + radii + breakpoints + motion + typography) ✓ |
| `tokens[]` | 11 | 238 | 240 unique CSS custom properties in `main.css` — **99% recall** ✓ |
| `components[]` | 6 | 97 | 97 `registry:ui` items in `registry.json` — **100% recall** ✓ |
| `libraries[]` | 6 | 42 | 42 design-surface deps in `package.json` (27 radix primitives + 15 others) — **100% recall** ✓ |

The bucket file is 242 KB (vs 21 KB in attempt 1). Exhaustiveness is expensive in disk; honest is what matters.

## Decision-level coverage

| Attempt 1 (7 decisions) | Attempt 2 (11 decisions) |
|---|---|
| color-strategy | color-strategy |
| — | **chart-strategy** ← new |
| — | **surface-hierarchy** ← new |
| shape-language | shape-language |
| token-architecture | **theming-architecture** ← renamed (pattern-named) |
| typography-voice | typography-voice |
| — | **font-sourcing** ← new (load-bearing absence) |
| — | **density** ← new |
| — | **interactive-patterns** ← new (focus-ring discipline) |
| theming → folded into theming-architecture | — |
| shadow-hierarchy: 4-tier (WRONG) | **elevation: 7 named tiers** (CORRECT, renamed) |
| motion | motion |

Coverage went from 7/11 (64%) → 11/11 (100%) of the load-bearing decisions identified in the audit of attempt 1.

## What the recipe tightening produced

1. **The agent wrote a script.** Following "use shell tools, identify the canonical signal" the agent generated `build-bucket.mjs` (pinned alongside the artifacts) that:
   - Walks `main.css` line-by-line, scope-aware (`@theme`, `:root`, `.dark`), captures every `--name: value` declaration with by_theme cascade.
   - Reads `registry.json` and emits one component row per `registry:ui` item.
   - Categorizes every `package.json` dependency by design surface (icons, primitives, motion, charts, forms, dates, command, toast, drawer, etc.).
   - Frequency-clusters values via `rg -oNI` with proper filename suppression.

2. **No leading repo-specific guidance was needed.** The recipe just said "find the canonical signal." For ghost-ui that's `registry.json`, `package.json`, and `main.css`. For a different repo it would be different files. Recipe stays agnostic.

3. **Pattern-naming worked.** `surface-hierarchy`, `theming-architecture`, `font-sourcing`, `density`, `interactive-patterns`, `elevation` all read as patterns rather than restated tokens. That's the prose discipline the existing pre-bucket expression had.

## Bug fixes verified

- Self-distance is now 0.0% (was 17.5% in attempt 1) — confirms the oklch backfill fix.
- Lint passes with 0 errors, 0 warnings, 0 info — no unused-palette flags, every palette entry cited in evidence.

## What's still imperfect

- **Spacing scale messiness**: attempt 2 records 22 distinct px values in the spacing scale. Real ghost-ui has a coherent rem-based component-height system (2rem, 2.75rem, 3rem, 3.25rem) layered on top of an ad-hoc px scatter (1, 2, 3, 4, 6, 8, 10, 12...). The bucket captured both honestly; the expression flattened them into a single `spacing.scale` array. A future iteration might split rem-component-height from px-utility values explicitly in the spec.
- **No dark-mode-specific rows for tokens that diverge between themes**: each token has a `by_theme` field when light/dark differ, but value-level dark-mode rows aren't separate rows. That's by design but worth noting.
- **The agent's heuristic categorizers** (e.g. "999px → radius, 1440px → breakpoint, others → spacing") are still heuristics. Misclassifications are possible; cross-checking against `map.md` topology would catch them.

## Follow-up bug found

`ghost-expression diff` reports `dominant primary: #1a1a1a` as a "+" addition when comparing attempt-2's expression to attempt-1's, even though both have the same dominant color (different role name: `ink` vs `primary`). Worth investigating — diff should match dominant entries by value when role names differ, OR surface "dominant role rename" as a distinct category. Filed as a follow-up; not blocking.

## Lessons for next iteration

1. **The script-driven extraction pattern is right.** The recipe should explicitly mention this — "for repos where canonical signals are programmatically enumerable (registry, manifest, named CSS declarations), generate a small extraction script and run it. Don't hand-author hundreds of rows."
2. **Spacing kind heuristics should fall through to `map.md` signals when ambiguous.** A 999px scalar is a radius in this repo because `--radius-pill: 999px`; a 1440px scalar is a breakpoint because `--breakpoint-desktop: 1440px`. The agent caught both; the recipe could codify the heuristic.
3. **The script is pinned alongside artifacts.** Anyone re-running the same target gets the same bucket. Reproducibility is a side-benefit of script-driven extraction.
