---
status: exploring
---

# Phase 2: the loader fold (the hard phase)

Second build phase after one-road + Phase 1 (node schema, shipped). This is the
one genuinely hard phase: where the system gains an in-memory **node graph** and
the loader learns to produce it. Read `context-graph.md`,
`graph-implementation-plan.md`, and `phase-1-node-schema.md` first.

## The honest correction (grounded in the code)

`context-graph.md` claimed the in-memory `GhostFingerprintDocument` and every
read consumer stay unchanged. **Reading the loader, that is too optimistic** and
the plan must say so:

- The in-memory doc is **richly typed facets**: `intent.principles[]` (each with
  `.principle` text, `guidance[]`, `evidence[]`, `check_refs[]`),
  `intent.situations[]`, `intent.experience_contracts[]`,
  `composition.patterns[]` (`.kind`, `.pattern`), `inventory` building blocks +
  exemplars + sources.
- `resolveSurfaceSlice` and `groundSurface` read those **typed fields directly**
  (`node.principle`, `entry.node.kind`).
- A Phase-1 **node is prose body + minimal frontmatter** (`id`, `under`,
  `relates`, `medium`) — by design it has *no* `.principle` string, `guidance[]`,
  or `evidence[]`.

So a node and a facet entry are different shapes. The fold is not a reshuffle;
it forces the central decision below. What *is* true from `context-graph.md`:
there is a clean seam (`files → loader → in-memory → consumers`), and we can
keep the build green by making Phase 2 **additive** — the node graph lands
*beside* the facet doc; consumer migration is later phases.

## The node content model: SETTLED — Option A (pure prose)

A graph node is `{ id, under, relates, medium, body }`. The **body is the
expression**; there are **no** structured node fields. The facet affordances —
`guidance`, `evidence`, `check_refs`, pattern `kind`, the `.principle` /
`.pattern` / `.contract` text slots — are **not** node structure and go away as
the model migrates. This is the cleanest end-state and is truest to
"intent/inventory/composition are authorship lenses, not fields."

What A means downstream (named honestly, so later phases own it):

- **gather slice changes shape** (Phase 3): a slice is no longer typed sections
  (`principles[]`, `patterns[]`); it is **nodes-by-provenance** — the relevant
  nodes and their prose, each tagged own / inherited-from-ancestor / via-edge.
- **checks grounding is reconceived from prose** (Phase 4): `why` / `what` come
  from the prose of the nodes on the surface + ancestors, not from `principle`
  statements and `exemplar` rows.
- **verify loses evidence/exemplar path-checking** (its own later phase): nodes
  have no `evidence` paths. That responsibility either disappears or moves; it is
  not a node concern under A.
- **compare/drift is reconceived over prose + topology** (later): no structured
  fields to diff; comparison works from the graph shape and node prose
  (embeddings already exist for prose-level comparison).

Phase 2 itself stays additive and green because **nothing reads the graph yet** —
the graph lands beside the facet doc, and consumers migrate one per later phase,
with the facet model deleted last.

## The one sub-decision: lossy facet→node projection (transition scaffold)

Existing packages and fixtures are facet-based. To keep the build green and
reuse fixtures, the fold projects facet entries into prose nodes during
transition: each `principle` / `pattern` / `contract` / `situation` / `exemplar`
becomes a node whose `id` is the entry id, `under` is its `surface:` tag (or
`core`), and whose **body is the entry's text** (`principle` / `pattern` /
`contract` string). This projection is **lossy on purpose** (it drops
`evidence` / `guidance` / `check_refs` — exactly the affordances A removes) and
is **explicit transition scaffolding, deleted in the facet-removal phase**. It
is not a permanent bridge. Decision: keep the projection (continuity + test
reuse) and mark it for deletion; do not let any new code depend on its lossy
output as if it were authoritative.

## Phase 2 scope

Additive. The facet loader, `resolveSurfaceSlice`, checks, compare are all
untouched and green at the end.

1. **`GhostGraph` in-memory type** (`ghost-core/graph/`): the resolved graph —
   `nodes` (id → `{ id, under, relates, medium, body }`), the `under` tree
   (parent edges, root = `core`), and `relates` links. Mirror, don't fight,
   `GhostSurfacesDocument` — surfaces already model a tree + typed edges; the
   graph is surfaces + placed prose nodes unified.

2. **`assembleGraph` — the fold.** Build a `GhostGraph` from two sources, unioned:
   - **on-disk node files** discovered in the package (see discovery below), and
   - **the lossy facet→node projection** above, so every existing package and
     test produces a (prose) graph for free and Phase 3 gather can be exercised
     against existing fixtures before facets are removed.

3. **Node discovery (layout, decided minimally).** Per the model, layout is free
   and the loader discovers. For Phase 2 pick one default and keep it simple:
   nodes are `*.md` files under a `nodes/` directory in the package (mirrors how
   `checks/*.md` already works via `loadChecksDir`). Loose-anywhere discovery and
   custom layouts are a later refinement; do not over-build discovery now.

4. **Attach additively:** `LoadedFingerprintPackage.graph?: GhostGraph`. The
   existing `fingerprint` (facet doc) and `surfaces` fields stay exactly as they
   are. Nothing that reads them changes.

5. **Tests** (`test/ghost-core/graph-fold.test.ts` + a loader test): the fold
   from node files; the lossy facet→node projection; the union; tree resolution
   (parent chain, root); `relates` carried through; a package with only facets
   still yields a prose graph; a package with node files yields a graph; medium
   carried; on-disk node wins over a same-id projection.

## Explicitly NOT in Phase 2

- Switching `gather` to traverse the graph (Phase 3, with `medium`).
- Switching `checks`/grounding to the graph (Phase 4).
- Switching compare/drift (later).
- Removing facet schemas/types/loader (the final phase, once every consumer is
  off them).
- Graph-level lint (target-exists, one-root, no-cycles) — Phase 8 lint, though
  the fold may surface obvious structural errors as thrown load errors like the
  current loader does.
- Cross-package resolution (Phase 6) — the fold resolves within one package.
- The `surface`→`node` rename of existing symbols — happens as consumers move.

## Open micro-decisions (decide while building)

1. **Is `core` a real node or an implicit root?** Surfaces treat `core` as the
   reserved implicit root. The graph should keep that: `under` omitted ⇒ child of
   implicit `core`. Lean: `core` is implicit unless an author writes a `core`
   node, in which case that node *is* the root content.
2. **Does the projection dedupe against on-disk nodes by id?** If an author has
   written a `checkout-trust` node *and* a facet projects the same id, the
   on-disk node wins (authored beats projected). Lean: yes, id-collision →
   authored node wins, projection skipped, lint notes it later.
3. **Graph keyed by node-id or by surface?** Both: nodes indexed by id; the
   surface tree (from `surfaces.yml` + node `under`) is the traversal spine.
   Reconcile `surfaces.yml` (the current explicit tree) with node `under` — for
   Phase 2, `surfaces.yml` remains the authoritative tree and nodes attach to it
   by their `surface`/`under`; unifying the two is a later cut.

## Read-back

Phase 2 succeeds if a `GhostGraph` type exists and `assembleGraph` folds both
on-disk node files and the lossy facet→node projection into one in-memory graph
of **pure-prose nodes** (tree + nodes + links + medium + body), attached
additively to `LoadedFingerprintPackage`, unit-tested, with the entire existing
system (facet loader, gather, checks, compare) untouched and green. The graph is
then in place for Phase 3 to point `gather` at it. Node content model: **A
(pure prose)** — settled; the facet→node projection is explicit transition
scaffolding marked for deletion in the facet-removal phase.
