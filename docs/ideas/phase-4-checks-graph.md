---
status: exploring
---

# Phase 4: route checks through the graph + ground from prose

Fourth build phase. The **second consumer migration** (after gather): checks
routing and review grounding move onto `GhostGraph`, and grounding is
**reconceived from prose** (Option A) rather than from typed
principles/patterns/exemplars. Read `phase-2-loader-fold.md` and
`phase-3-gather-graph.md` first.

## Goal and boundary

- `ghost checks --surface <ids>` selects governing checks by **graph** cascade
  (not the surfaces-doc `cascade.ts`).
- Grounding (`why` / `what`) becomes **the graph slice's prose nodes** — there
  are no facet `principle`/`pattern`/`exemplar` types to split on anymore.
- `ghost review` consumes the same graph-based routing + grounding.

Done when checks + review run on the graph, the facet-based `groundSurface` and
the surfaces-`cascade.ts` routing are no longer used by these commands, tests
pass, and the remaining facet consumer (compare) is still green.

## The grounding reconception (the heart of Phase 4)

Today grounding is **two typed lists**:

- `why`: principles + experience contracts (the design intent a finding cites).
- `what`: composition patterns + inventory exemplars (what good looks like).

Under Option A there are no such types — a node is prose with provenance. So the
honest question: does the why/what split survive?

**Decision (settled): drop the why/what framing entirely; grounding is the prose
slice by provenance.** why/what is not a structure Ghost extracts — it is a
*quality of well-authored guidance*. A good intent node already says the why
("near payment, reduce felt risk"); a good guideline already gestures at what
good looks like — because the **authoring skill prompted the human** to cover it
(intent/inventory/composition as the ephemeral lenses). So Ghost does not pull
why/what into headers; it hands over the prose, and the why and what live *in*
the prose. The burden of ensuring nodes contain both moves to the authoring
skill (a later phase), which is the correct place for it — authoring-time
guidance, not review-time extraction. The new grounding is:

```ts
interface GraphGrounding {
  surface: string;
  nodes: GraphSliceNode[];   // the slice (own + ancestors + one-hop edges)
}
```

i.e. **grounding = the gather slice**. A check that fires on a surface is
grounded by that surface's gathered nodes; the agent cites node ids and quotes
prose. This unifies "context for generation" (gather) and "grounding for review"
(checks/review) onto **one resolver** — which is the right simplification: they
were always the same slice, viewed for different purposes.

Consumers that printed `## Why` / `## What good looks like` now print grounded
nodes by provenance (own → ancestor → edge), each as id + prose. The
`missing-fingerprint` / silent-grounding behavior is unchanged (empty slice =
silent).

## Routing on the graph

`selectChecksForSurfaces` currently walks the surfaces-doc parent map
(`buildParentMap` + surfaces `ancestorChain`). Repoint it at the graph:

- a check's placement is its `surface:` frontmatter (unplaced ⇒ `core`);
- it governs a touched surface when its placement equals that surface (own) or
  any **graph** ancestor of it (cascade), using `ancestorChain(graph, id)` from
  Phase 2;
- `core` governs every diff (unchanged).

The routing *logic* is identical — only the ancestry source changes from the
surfaces doc to the graph. Keep `RoutedCheck` / `CheckRelevance` shapes as-is
(they reference surface ids, which the graph still has).

Note: checks themselves stay `ghost.check/v1` markdown with `surface:`
frontmatter — Phase 4 does not change the check artifact, only how routing finds
ancestors. (Renaming `surface:` to a node ref is a later cleanup, not this
phase.)

## Files

```
ghost-core/graph/
  ground.ts        # groundGraph(graph, id, opts?) → GraphGrounding  (the slice)
  index.ts         # export it
ghost-core/check/
  route.ts         # selectChecksForSurfaces: walk graph ancestry, not surfaces
```
Update `checks-command.ts` and `review-packet.ts` to:
- call the graph-based `selectChecksForSurfaces(checks, graph, touched)`,
- call `groundGraph(graph, surface, { incarnation? })` instead of
  `groundSurface(...)`,
- format grounded nodes by provenance.

## Incarnation in checks (small, consistent)

`checks` and `review` gain an optional `--as <incarnation>` so grounding is
filtered to the relevant incarnation (same filter as gather). A check itself is
not incarnation-tagged in Phase 4 (check artifact unchanged); only its grounding
slice is filtered. Lean: add `--as` to both commands, pass through to
`groundGraph`. (Optional — can defer if it bloats the phase; routing does not
need it.)

## Tests

- `test/ghost-core/graph-ground.test.ts`: grounding = slice nodes by provenance;
  silent when empty; incarnation filter applied.
- `test/ghost-core/check-route-graph.test.ts` (or update the existing route
  test): own/ancestor cascade via graph ancestry; `core` governs always;
  unplaced check ⇒ core.
- Update `cli.test.ts` checks/review assertions from `grounding[].why/what` to
  `grounding[].nodes` (or the chosen output shape). The facet→node projection
  keeps the fixtures producing grounded nodes.

## Explicitly NOT in Phase 4

- Switching compare/drift to the graph (next).
- Removing facet schemas/types/loader, `resolveSurfaceSlice`, `groundSurface`,
  surfaces-`cascade.ts` (final phase — compare still uses facets until then;
  delete these once compare is migrated).
- Changing the `ghost.check/v1` artifact (surface frontmatter → node ref is
  later).
- Cross-package routing/grounding (Phase 6).
- The `surface`→`node` rename of symbols.

## Open micro-decisions (decide while building)

1. **why/what — settled: dropped (see above).** One provenance-ordered prose
   node list; no why/what headers, no provenance-derived relabeling. The why and
   what live in the prose, ensured by the authoring skill, not by Ghost
   extraction. The review prompt text should be reworded to "read the grounded
   nodes" rather than "use why then what."
2. **Exemplar paths — DEPRECATE + flag for removal (settled).** Old grounding
   surfaced exemplar `path:` (a concrete file to look at). Prose nodes have no
   `path`. The facet→node projection stops carrying it now (grounding won't have
   it), and the field is flagged for removal with the rest of the facet model in
   the final deletion phase. Authors who want to point at a file write the path
   in the node body, where the agent reads it as context anyway.
3. **`groundGraph` vs reuse `resolveGraphSlice` directly.** Grounding *is* the
   slice — `groundGraph` may be a thin alias (slice + the surface label) rather
   than a separate function. Lean: thin wrapper for naming clarity, or have
   checks/review call `resolveGraphSlice` directly and drop `groundGraph`
   entirely. Decide while wiring; fewer functions is better.

## Read-back

Phase 4 succeeds if `checks` and `review` route by graph ancestry and ground
from the **prose graph slice** (no why/what framing — provenance-tagged prose
nodes, with the why and what carried in the prose itself), with the facet-based
`groundSurface` + surfaces routing no longer used by these commands, optional
`--as` filtering grounding, tests green, and compare (the last facet consumer)
untouched. Exemplar `path:` is dropped from grounding and flagged for removal.
After this, only compare/drift remains on facets before the facet model can be
deleted.
