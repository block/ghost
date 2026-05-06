---
status: exploring
---

# ghost fingerprint

## Why it's interesting

Fingerprint is the flagship — the verb everyone meets first. Today it's tangled with the rest of the engine in `packages/ghost-drift`. Decomposing means stripping `ghost fingerprint` back to its real job: **authoring fingerprint.md**. Compare/ack/track/diverge are about *change* and belong in drift. Fingerprint owns the artifact, the format, the lint, the parse/compose/diff math, and the profile recipe that writes it.

The other shift: with `ghost map` upstream, profile no longer rediscovers topology on every run. Map.md hands the agent the design-system location, the feature_areas worth sampling, and the entry files for resolving token chains. The interpretation work — reading components and synthesizing the prose body — still happens, but it starts from a known map. On a 1,580-module monorepo, that's the difference between 30 minutes of exploration and ~5 minutes of resolution.

## Architecture

```
packages/ghost-fingerprint/
├── src/
│   ├── core/
│   │   ├── parse.ts        # fingerprint.md → AST
│   │   ├── compose.ts      # AST → fingerprint.md
│   │   ├── diff.ts         # structural diff (text-level, not embedding-level)
│   │   └── lint.ts
│   ├── cli.ts
│   ├── bin.ts
│   └── skill-bundle/
│       └── references/
│           ├── profile.md  # the recipe
│           └── schema.md   # condensed fingerprint.md spec
```

Embedding math, semantic embedding, and target resolution move to `@ghost/core` (internal shared package). Compare/ack/track/diverge move to `ghost-drift`.

## CLI surface

```bash
ghost fingerprint lint fingerprint.md         # validate against schema
ghost fingerprint describe fingerprint.md     # section ranges + token estimates
ghost fingerprint diff a.md b.md             # structural text diff (NOT embedding compare)
ghost fingerprint emit <kind>                # review-command | context-bundle | skill
```

Four verbs, all deterministic, all orthogonal. `diff` is text/structural — the embedding-based version lives in drift. They're genuinely different operations: `diff` shows "these prose paragraphs changed"; `compare` shows "these embeddings drifted by 0.18."

## Profile recipe — map-aware

Lives at `packages/ghost-fingerprint/src/skill-bundle/references/profile.md`. Refactored, not rewritten — today's recipe is already 101 lines. Map.md eliminates *location-discovery* steps; *interpretation* work (reading components, synthesizing prose) stays.

```
1. Locate map.md. If present, use it. If missing, prompt to run `ghost map`
   first; fall back to inline location discovery only when map can't run.
2. From map.md.design_system.entry_files, resolve every token chain to its
   concrete value.
3. From map.md.feature_areas + sub_areas, sample 6–10 product UI files
   spanning distinct surfaces. Read each well enough to populate `roles[]`.
4. Synthesize fingerprint.md — Character + Decisions in the body,
   frontmatter holds tokens + rules + evidence paths.
5. `ghost fingerprint lint fingerprint.md` — fix until clean.
```

Realistic delta: today's 101-line recipe shrinks to ~85 lines. The big win is **runtime, not tokens** — file-discovery loops collapse from minutes to seconds when map.md is present.

## What moves vs stays

| Currently in `ghost-drift` | New home |
|---|---|
| `compare` (pairwise + composite) | `ghost drift compare` |
| `ack`, `track`, `diverge` | `ghost drift` |
| `lint`, `describe`, `emit` | `ghost fingerprint` |
| `core/fingerprint/` (parse/compose/diff/lint) | `ghost-fingerprint/core` |
| `core/embedding/` | `@ghost/core` (shared) |
| `core/evolution/` | `ghost-drift/core` |
| `core/reporters/` (compare formatters) | `ghost-drift/core` |
| `core/context/` (review-command, context-bundle) | mostly `ghost-fingerprint`; review-command duplicates may need to live in drift |

**`emit` location is settled: all three kinds stay in fingerprint.** The drift audit confirmed `core/context/` (review-command + context-bundle generators) has zero imports from embedding, compare, or evolution. Both are deterministic over fingerprint.md alone. Drift gets neither verb; fingerprint owns the full emit surface (`review-command | context-bundle | skill`).

## Open questions

- **Skill bundle strategy: settled.** One bundle per tool. Each package ships `src/skill-bundle/` independently and emits via its own verb (`ghost map emit skill`, `ghost fingerprint emit skill`, `ghost drift emit skill`, `ghost fleet emit skill`). No meta-emit. Cross-tool references in recipes happen through verb names in prose ("then run `ghost drift ack`"). The `discover.md` and `generate.md` recipes are dropped from scope (not needed at this stage).
- **First-time profile vs re-profile.** Today's recipe doesn't distinguish. After a refactor that moves the design system, re-profile reads stale map.md. Solution: re-profile re-runs map first. Worth making the dependency explicit in the recipe.
- **Multi-product repos.** Cash iOS has banking + p2p + bitcoin + investing as distinct brand surfaces. Today the recipe produces one fingerprint.md. Should multi-product repos produce one fingerprint with sub-fingerprints, or N fingerprints with a fleet view binding them? Per the fleet audit, this is exactly the **modular profiling pathway** — N module fingerprints + 1 rollup synthesis. Fingerprint's profile recipe needs a `mode: target | module | rollup` parameter so the same recipe can produce all three pass types under different framings.

## Reality check (post-audit)

After studying the existing implementation, here's what was confirmed and what needs correction.

**Confirmed by the code:**
- `core/fingerprint/` (parse, compose, diff, lint) is cleanly orthogonal — zero cross-coupling to embedding or context. Safe extraction into `ghost-fingerprint`.
- `diffFingerprints()` already exists as a library export but isn't CLI-wired. Adding `ghost fingerprint diff` is ~20 lines of CLI glue, not a new feature.
- `describe` does exactly what the plan claims — section line ranges + token estimates, via `layoutFingerprint()` in `core/fingerprint/layout.ts`.
- `core/context/` (review-command + context-bundle) has zero drift dependencies. Both belong in fingerprint. Settled.
- `core/fingerprint/` only touches embedding via a lazy fallback path. The fingerprint/embedding boundary is clean; embedding can move to `@ghost/core` without dragging fingerprint with it.
- Today's `profile.md` is 101 lines, not the ~600 my draft assumed.

**What shifted:**
- **The "3x shrink" claim was overstated.** Today's recipe is already terse. Map.md trims ~15% of guidance (the location-discovery steps), not 3x. The real win is **runtime** — file-discovery loops on a 1,580-module repo collapse from minutes to seconds when map.md is present. The plan now reflects that.
- **Map.md should be optional, not required.** Forcing it breaks fingerprint on any repo that hasn't been mapped yet. Recipe falls back to inline location-discovery when map.md is missing; ideally also prompts to run map first. Backcompat preserved.
- **Skill bundle strategy: now settled — one bundle per tool, no meta-emit.** See open questions section. Loader rework is the implementation cost; happens during the package split.
- **Modular profiling needs a recipe-level parameter.** Fleet's three-mode pathway (target/module/rollup) means profile is invoked under three different framings. Fingerprint's profile recipe should take a `mode:` parameter rather than three separate recipes.

## Out of scope

- Embedding-based compare (drift owns it).
- Evolution verbs ack/track/diverge (drift owns them — they're explicit acts on change, not authoring).
- Multi-format storage.
- LLM in CLI verbs; profile is a recipe, not a verb.

## Next steps

1. Map every export in `packages/ghost-drift/src/core/index.ts` to its new home (fingerprint / drift / `@ghost/core`).
2. Sketch the `@ghost/core` shared package (embedding math + target resolver).
3. Decide skill bundle strategy (unified / per-tool / per-tool + meta-emit). This unblocks the package layout.
4. Refactor `profile.md` recipe to consume map.md as optional input — fall back to inline discovery when missing.
5. Wire `ghost fingerprint diff` as a CLI verb over the existing `diffFingerprints()` library function.
6. Plan the migration: `ghost-drift` package keeps its name on npm but contents shrink to drift-only; `ghost-fingerprint` is the new sibling carrying the canonical artifact and emit verbs.
