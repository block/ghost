# Ideas

Live, non-authoritative exploration that should not be lost to chat history but
is not yet public docs. Notes are subordinate to `../purposes.md` (one model,
many projections).

This folder is pruned in focus passes: notes that only describe superseded
models, shipped execution plans, or removed commands are deleted — the code and
git history are the record. What remains is either *settled architecture*,
*durable reference*, or *open/parked exploration*.

## Settled

- `fingerprint-first-architecture.md` — the product center: Ghost is
  fingerprint-first; the durable artifact is the checked-in `.ghost/` package.
  Everything else is tooling for or around that contract.

## The model (what shipped)

Ghost is a **curated graph of described nodes**. The full design and its
prior-art lineage live here:

- `context-graph.md` — the core model: nodes + `under`/`relates` links;
  OKF as substrate prior-art; `description` as the tool-style retrieval payload;
  the conformance invariants. The canonical reference for what Ghost *is*.
- `scenarios-worked.md` — five worked fingerprints (dashboard, monorepo,
  marketing, voice-first app, one-brand superset) that stress-tested the model.
  Durable reference for how the shape behaves.

> **Cut in this version (see banners in the notes below).** Two axes these notes
> explore were considered and removed rather than shipped: the **`incarnation`
> tag + `--as` filter** (cross-medium projection) and **cross-package `extends`**
> / inherited nodes (the shared-brand fleet). A Ghost package is now a single,
> single-medium, self-contained contract. The reasoning is kept because it maps
> the shape of the problem, not because these features exist.

## Open / parked exploration

- `contract-storage.md` — the on-disk organization fork (now largely subsumed by
  `context-graph.md`: storage is a free projection over the schema). Kept for the
  reasoning.
- `compare-drift-fleet-rethink.md` — **parked.** Concepts held, implementations
  removed (they rested on the abandoned quantified-design-system model). Records
  the intent and the trigger to rebuild them graph-native.

## Independent

- `ghost-ui.md` — additive registry metadata for the private Ghost UI package.

## Conventions

- One file per idea, kebab-case slug, `status:` frontmatter
  (`exploring` / `settled` / `parked`).
- Idea notes are subordinate to the fingerprint-package model.
- Delete notes that only describe superseded models, shipped plans, or removed
  commands — git is the record.
