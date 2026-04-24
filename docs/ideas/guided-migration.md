---
status: exploring
---

# Guided migration: drifting a fingerprint toward another

An agentic loop where repo A consciously migrates toward repo B's visual direction, driven by fingerprint distance + vector as the signal.

## The observation

Embedding distance is a *tier selector*, not a progress bar. Closing 0.6 → 0.3 is usually easier than 0.3 → 0.05: the first half removes obviously wrong answers (different font family, different base unit, different radii language); the second half means reconciling deliberate choices that both sides consider correct. The last 0.05 is where child identity lives and often shouldn't go to zero at all.

## Distance tiers

| Distance | Meaning | Mode |
|---|---|---|
| < 0.15 | Accidental drift | **Reconcile** — token renames, no philosophy work |
| 0.15 – 0.3 | Deliberate variance on shared foundation | **Negotiate** — diff decisions, `adopt` or `diverge` each gap |
| 0.3 – 0.5 | Different decisions on similar kind of system | **Adopt decisions first, tokens follow** — chasing the scalar alone will mimic without migrating |
| > 0.5 | Different design languages | **Question the premise** — often not a migration |

## What the scalar hides

- **Shape.** Distance 0.3 spread across four dims is uniform drift; 0.3 concentrated in palette is a single PR. Same headline, opposite plans. `computeDriftVectors` already exposes the per-dim direction.
- **Irreducible distance.** Some gap is intentional (accessibility floor, CJK glyph support, dense-data use case). Target isn't `d = 0`; it's `d ≤ floor + ε` where `floor = Σ(diverged_dims × weight)`. Floor is computed from the manifest, not guessed.

## What would be built

A `migrate.md` skill recipe alongside profile / review / verify / generate / discover. Loop shape:

1. `adopt B` — snapshot starting per-dim distances into `.ghost-sync.json`.
2. Pick the steepest dim from `computeDriftVectors`.
3. Host agent translates that delta into code edits, respecting the tier (reconcile vs negotiate vs adopt).
4. Re-profile → `ack` → repeat.
5. Stop when `d ≤ floor + ε`, or agent hits a dim the user marks `diverging`.

No CLI primitive is missing. All the judgement work lives in the recipe.

## Open questions

- **Ordering within a tier.** Vector-first (fast, risks mimicry), decisions-first (correct, slow), or interleaved (each `ack` commits one dim + the decisions that justify it). Current lean: interleaved.
- **Detecting when the scalar is lying.** Child can descend the vector gradient without importing decisions, landing at low `d` but not actually looking like B. Candidate: don't declare success until *both* the machine dims and the decisions dim are inside tolerance.
- **Diverge budget up front.** Should `adopt` accept `--diverge <dim>,<dim>` so the floor is known before the loop runs, instead of discovered mid-migration?
- **Symmetry.** `checkBounds` already flags `reconverging` when a diverging dim has closed to < 50% of acked distance. Guided migration is the deliberate form of that — same bookkeeping, inverted intent. Worth thinking about whether the two should share a verb.
