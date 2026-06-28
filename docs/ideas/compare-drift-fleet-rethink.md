---
status: parked
---

# Compare / drift / fleet — concepts parked, implementations removed

The **concepts hold**; the **implementations did not**, so they were removed
(not frozen — dead code does not linger). This note preserves the intent and the
trigger to rebuild them graph-native.

## Why the implementations went

compare / drift / fleet were built when Ghost scanned code for an explicit
**design system** and quantified it. They rested on two things the context-graph
reframe (Option A, prose nodes) abandoned:

1. **`decisions[]` with embeddings** — a structured, quantified design-decision
   record, distance computed by cosine + color-space math
   (`ghost-core/embedding/`). Graph nodes are prose; there is no
   `decisions[].embedding` to diff.
2. **13 fixed visual dimensions** (`color-strategy`, `typography-voice`,
   `elevation`, `font-sourcing`, `token-architecture`, …). These are the
   vocabulary of a scanned visual design system. They are meaningless for the
   media Ghost now serves — what is the `elevation` distance of a *voice*
   incarnation?

They were also a **parallel subsystem**: they never read the `.ghost/` package
graph, only a separate direct-`fingerprint.md` artifact (`### Dimension` blocks +
`decisions[]`) via `comparable-fingerprint.ts`. Removing them did not touch the
graph world.

## What was removed

- CLI verbs: `compare`, `drift`, `ack`, `track`, `diverge` (+ `--gate`).
- `compare.ts`, `drift-command.ts`, `evolution-commands.ts`,
  `comparable-fingerprint.ts`.
- `core/` (compare, gate, `evolution/`, `reporters/`).
- `ghost-core/embedding/` (the quantified-visual distance engine).
- `decision-vocabulary.ts`, `perceptual-prior.ts`, `decisions[]` / dimension
  schema fields.
- Direct-`fingerprint.md` machinery (`scan/parser.ts`, `scan/writer.ts`,
  `scan/diff.ts`, `fingerprint-load.ts`, `loadFingerprint`) and its lint
  affordance — its only real consumer was compare/drift.
- Public exports: root `compare`/`drift`, `./compare` + `./drift` subpaths.

## The concepts (still valid, sharper under the graph)

- **compare** → "how does surface A's expression relate to surface B's?" The
  Scenario-E question: is checkout's voice consistent with email's?
- **drift** → "has this surface's expression diverged from what we intended, or
  from its sibling that projects the same `core` node?"
- **fleet** → "what does our whole design world look like across products?"

These are exactly the questions `context-graph.md` said the graph would answer
well — once the model is settled.

## Rethink trigger + likely shape

Rebuild **after authoring and cross-package land** (the node/edge model must be
stable to define graph diff/distance properly). Graph-native sketch:

- **Structural diff**, not embedding distance: nodes/edges/incarnations added /
  removed / moved; deterministic and explainable (the calculator grain).
- **Coherence over projection-siblings**: compare the nodes that descend from /
  relate to the same `core` node across surfaces — the brand-consistency check.
- **Prose comparison stays optional**: if semantic distance is wanted, embed node
  prose behind an opt-in flag; never the primary, deterministic path.
- **No fixed visual-dimension vocabulary** — the graph's own structure (surfaces,
  incarnations, relates) is the axis set.
