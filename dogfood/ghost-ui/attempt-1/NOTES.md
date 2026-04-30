# Attempt 1 — ghost-ui scan, 2026-04-29

First end-to-end dogfood of the new three-stage scan pipeline (`map.md` → `bucket.json` → `expression.md`) against `packages/ghost-ui`. Authored by an agent (Claude Opus 4.7) following the bundled `map.md`, `survey.md`, `profile.md` skill recipes. All three artifacts lint clean.

## What worked

- Pipeline ran end-to-end: every stage produced a lint-clean artifact.
- `bucket fix-ids` worked as designed — agent authored rows with `"id": ""`, finalized in one pass.
- Schema flexed across every value kind (`color`, `spacing`, `radius`, `shadow`, `breakpoint`, `motion`, `typography`, `layout-primitive`).
- Token alias chains captured the 3-deep indirection cleanly (`--color-foreground` → `--foreground` → `--text-default` → `--color-gray-900`).

## What failed

### 1. Bucket recall ~10–20%

Massive undercount across every section:

| Section | Recorded | Reality | Recall |
|---|---|---|---|
| `components` | 6 | 97 UI primitives + 48 AI elements + 5 themes (~150 registry items) | ~4% |
| `values` (distinct hexes) | 8 | 25 distinct hexes in canonical token layer (139 across `src/`) | ~32% |
| `tokens` | 11 | 80+ named tokens in `main.css` alone | ~14% |
| `libraries` | 6 | 27 distinct `@radix-ui/*` packages alone (rolled into 1 row) | OK at the category level |

The recipe instructed exhaustiveness; the agent sampled. **A 90% undercount is a failed scan** — the interpreter downstream cannot recover what wasn't recorded.

### 2. Decision-level coverage 7/11

Missed four load-bearing decisions named in the prior expression.md (authored under the old single-pass recipe):

- **`font-sourcing`** — ghost-ui ships zero bundled fonts (`font-faces.css` is one comment). Critical character claim, missed entirely.
- **`interactive-patterns`** — global `*:focus-visible` discipline applied uniformly; missed.
- **`density`** — "compact controls inside generous structural whitespace" composition; missed.
- **Charts as a sub-strategy** — 5-color warm chart palette deliberately departing from the monochromatic discipline; missed.

### 3. Quantitative errors in named decisions

- **`shadow-hierarchy: 4-tier`** is wrong. There are **7 named tiers** (`mini`, `btn`, `card`, `elevated`, `popover`, `modal`, `kbd`) plus 2 special-purpose (`mini-inset`, `date-field-focus`).
- **`color-strategy`** overstated "no brand or accent color." `--background-accent` exists (mapping to `gray-900`). The real claim is *monochrome accent* — a deliberate refusal of chromatic accent.

### 4. Decision naming bias

The new bucket-grounded recipe produced more literal/technical names (`color-strategy`, `shape-language`, `shadow-hierarchy`) where the existing expression named patterns at a more useful abstraction (`surface-hierarchy`, `elevation`, `theming-architecture`, `interactive-patterns`). The recipe should reinforce "name the pattern, not the value."

### 5. Bug in self-distance check (separate from the recipe)

`ghost-drift compare expression.md expression.md` reports 17.5% self-distance because `loadExpression` doesn't backfill `oklch` on palette colors. `comparePalette` then treats every color as fully unmatched (distance 1). Fix shipping in attempt 2's run; not a recipe issue.

## Lessons for attempt 2

1. **Exhaustiveness is the load-bearing rule** — the agent must enumerate every section's source of truth, not sample. Cross-check counts from two independent passes; a divergence > ~10% means re-pass. Already strengthening this in `survey.md`.
2. **No leading repo-specific guidance** in the recipe (e.g. don't say "use registry.json") — Ghost is BYOA-agnostic. The recipe states the discipline; the agent identifies the canonical signal in this repo.
3. **Profile recipe should reinforce "name the pattern, not the value."** Decision dimensions like `font-sourcing`, `interactive-patterns`, `density` are more useful than restated tokens.
4. **Cross-check decision count against prior art when available.** If the old `expression.md` had 11 dimensions and the new has 7, ask why the four absent ones weren't observable — usually a recall gap upstream.
