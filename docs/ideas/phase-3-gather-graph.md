---
status: exploring
---

> **Naming (settled):** the per-node output axis is **`incarnation`** (node
> field) filtered by **`--as`** (gather flag). The fingerprint is disembodied
> intent; a tagged node is that intent *incarnated* in one output (email,
> billboard, voice — voice-safe, unlike render/form/look). `gather launch --as
> email` reads as "gather the launch context **as** an email." Untagged nodes
> are free essence (cascade to every incarnation).

# Phase 3: point gather at the graph + introduce incarnation (`--as`)

Third build phase. The **first phase where a consumer reads the graph**, and the
first user-visible shape change. Read `phase-2-loader-fold.md` first; this builds
directly on `GhostGraph` and `assembleGraph`.

## Goal and boundary

`ghost gather <surface> [--as <incarnation>]` composes its context packet by
**traversing the graph** (Phase 2), not by reading facet sections. The slice
changes shape from typed facet sections to **nodes-by-provenance** (Option A:
nodes are prose). `incarnation` enters the model as a filter.

Done when:

- a new `resolveGraphSlice(graph, id, { incarnation })` returns
  nodes-by-provenance,
- `gather` uses it and formats prose nodes (markdown + json),
- `--as` filters the slice by incarnation,
- the surface menu still works (built from the graph/surfaces),
- unit + CLI tests pass; everything else stays green.

Because the Phase 2 fold projects facets into the graph, **existing fixtures
still produce a graph**, so gather can switch to the graph without authoring any
new node files — the projection carries the old packages through.

## The mapping is the agent's; the gather is deterministic

The seam is the **node id**. Above it is fuzzy and LLM-driven; below it is exact
and Ghost-driven. Ghost does zero NLP.

```
prompt ──▶ [ LLM: which node(s)? ] ──▶ id(s) ──▶ [ Ghost: gather ] ──▶ packet
           the MAPPING (fuzzy, NL)               the GATHER (graph traversal)
```

- The agent calls `gather --format json` with no id to get the **menu** (the
  surfaces with authored descriptions), matches the prompt against it, and picks
  the id. That matching is the agent's call — there is no path→surface
  lookup (one-road deleted it).
- The agent then calls `gather <id> --as <incarnation>`; Ghost traverses and
  returns. Same input → same packet, always. This is what keeps trace / checks /
  review explainable.

## One gather is one region; multiplicity lives in the agent loop

`gather` takes **one** id and returns **one** packet — but that packet is a whole
connected region (own + cascaded ancestors + one-hop `relates`), never a single
node. For most prompts, one region is the right answer.

For prompts that touch **disjoint** regions (e.g. "make checkout *and* its
confirmation email reassuring"), the **agent gathers each id separately and
synthesizes** — each call with its own `--as`:

```
gather checkout --as web
gather email    --as email
```

This is deliberate, not a gap:

- Per-call `--as` is a feature — checkout wants `web`, the receipt wants `email`;
  a single merged call would force one incarnation across both (wrong for
  cross-channel prompts, Scenario E).
- Merge semantics (dedup shared `core` ancestors, re-base provenance per
  requested id) are a rabbit hole we do not need to ship gather.
- The agent already owns the fuzzy mapping; looping N times is the same muscle.

Note the deliberate asymmetry: `checks`/`review` take `--surface <ids>` (plural,
because they produce one combined gate); `gather` stays **single-id atomic**
(context the agent reasons over region-by-region). Do not pluralize gather.

## The slice shape change (the heart of Phase 3)

Today `ResolvedSlice` is four typed arrays (`situations`, `principles`,
`experience_contracts`, `patterns`), each `SliceNode<TypedFacet>`. Under Option
A there are no typed facets — just prose nodes. So the new slice is **one list of
nodes, each with provenance**:

```ts
interface GraphSliceNode {
  id: string;
  body: string;            // the prose expression
  incarnation?: string;    // the node's tag, if any
  provenance:
    | { kind: "own" }
    | { kind: "ancestor"; from: string }
    | { kind: "edge"; via: GhostNodeRelationKind; from: string };
}

interface GraphSlice {
  surface: string;         // the requested node/surface id
  ancestors: string[];     // chain up to (excl.) core, as today
  incarnation?: string;    // the --as filter applied, if any
  nodes: GraphSliceNode[];
}
```

The composition rules are **the same cascade semantics** that `resolveSurfaceSlice`
already encodes — only the node shape and the traversal source change:

- **own**: nodes whose containment is the requested id.
- **ancestor**: nodes on each ancestor up to `core` cascade down.
- **edge**: one hop along `relates` — the related node's body is included, tagged
  by qualifier (`reinforces`/`contrasts`/`variant`). (Maps the old `composes`/
  `governed-by` surface edges onto the node `relates` model.)

Reuse `ancestorChain` from `graph/assemble.ts` (already built in Phase 2) instead
of the surfaces-specific `cascade.ts` chain.

## The incarnation filter (`--as`, the new capability)

`--as <incarnation>` filters which nodes appear:

- A node with **no incarnation** (or `any`) is essence → always included
  (it cascades to every incarnation). This is the brand-soul behavior.
- A node tagged `incarnation: <x>` is included **only** when `--as <x>` matches.
- A node tagged a **different** incarnation is excluded.
- **No `--as`** → no filtering (every node, regardless of tag). The agent gets
  the whole surface; incarnation is opt-in narrowing.

Default incarnation: Phase 3 keeps it simple — `--as` is the only input; a
manifest default incarnation is a later refinement (note it, don't build it).

## Files

```
ghost-core/graph/
  slice.ts        # resolveGraphSlice(graph, id, opts) → GraphSlice  (+ types)
  index.ts        # export it
```
Update `gather-command.ts` to call `resolveGraphSlice(loaded.graph, …)` and
format prose nodes. Keep `buildSurfaceMenu` as the menu source for now (it reads
surfaces; the graph has the same tree — unifying menu onto the graph is a small
later cleanup, not required here).

## gather output (markdown + json)

- **json** is the agent contract: `{ surface, ancestors, incarnation?, nodes: [{
  id, body, incarnation?, provenance }] }`. This *replaces* the old
  typed-section json.
- **markdown** is the human preview: a `# Ghost Context: <id>` header, the
  cascade chain, then each node rendered as its id + provenance label + prose
  body (trimmed/previewed). Drop the per-facet `## Situations / ## Principles`
  sections — there are no facets now; it is one provenance-ordered list (own
  first, then ancestors, then edges).

## Tests

- `test/ghost-core/graph-slice.test.ts`: own/ancestor/edge provenance from a
  hand-built graph; `--as` filter (essence/untagged always in; matching in;
  mismatched out; no-filter = all); ancestor cascade depth; edge one-hop only
  (no recursion).
- Update the existing gather CLI tests (`gathers a composed slice…`, menu tests)
  to the new json shape. The facet→node projection means the existing fixtures
  keep working; assertions move from `slice.principles[…].provenance` to
  `slice.nodes.find(n => n.id === …).provenance`.

## Explicitly NOT in Phase 3

- Switching `checks`/grounding to the graph (Phase 4).
- Switching compare/drift (later).
- Removing facet schemas/types/loader or `resolveSurfaceSlice` (final phase).
  `resolveSurfaceSlice` stays until checks/compare are also off facets; Phase 3
  just stops `gather` from using it.
- Manifest default incarnation, multi-valued incarnation (later).
- Multi-id / merged gather — gather stays single-id; the agent loops (see above).
- Cross-package gather (`@scope/pkg#id`) — Phase 6.
- The `surface`→`node` rename of symbols.

## Prerequisite rename (do first, in this phase)

The Phase 1/2 node model used the working name **`medium`**. Phase 3 settles it
as **`incarnation`**. Rename before adding the filter so there is one name in the
tree:

- `GhostNodeFrontmatter.medium` → `incarnation`; schema key `medium` →
  `incarnation` (still optional, open string).
- `GhostGraphNode.medium` → `incarnation`; projection + fold carry it through.
- Update Phase 1/2 tests that assert `medium`.

This is a mechanical, contained rename (the field is barely consumed yet) and
keeps the model honest before `--as` lands.

## Open micro-decisions (decide while building)

1. **Edge mapping.** Phase 2 nodes carry `relates` (`reinforces`/`contrasts`/
   `variant`); legacy surfaces carry `composes`/`governed-by` edges that the
   projection does not currently turn into `relates`. For Phase 3, the
   projected graph has no `relates` (facets had surface-level edges, not
   node-level). Decision: Phase 3 edge contributions come from node `relates`
   only; the legacy surface-edge → slice behavior is **not** reproduced through
   the graph (it was a surfaces-doc feature). If a fixture relied on
   `composes`-edge slice contributions, port it to a `relates` node or accept the
   simplification. Flag any test that breaks here as a real semantic decision,
   not a bug.
2. **Body preview length in markdown.** Lean: full body in json; in markdown,
   the whole body (nodes are short) — revisit only if output is huge.
3. **Provenance ordering.** own → ancestor (nearest first) → edge. Stable + matches
   how an agent should weight them.

## Read-back

Phase 3 succeeds if `gather` composes its packet by traversing `GhostGraph` and
emits **nodes-by-provenance prose** (json + markdown), with `--as` filtering by
incarnation (essence always in, matching in, mismatched out, absent = all), the
menu intact, gather single-id (multiplicity in the agent loop), tests green, and
checks/compare/facet-loader untouched. This is the first consumer on the graph
and the first taste of the incarnation axis; Phase 4 follows by
routing checks through the same graph.
