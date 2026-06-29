---
status: exploring
---

# Implementation plan: the context-graph model in code

Turns `context-graph.md` + `scenarios-worked.md` into a sequenced build. Grounded
in the **actual** current code, not a greenfield sketch. Read those two notes
first for the model; this note is the *how*.

## The load-bearing code fact (verified)

The current code already has the shape's bones:

```
files ──(loadFingerprintPackage → assembleFingerprint)──▶ GhostFingerprintDocument ──▶ everything
                         ▲ the ONE structural seam
```

- `GhostFingerprintDocument` (ghost-core/fingerprint/types.ts) — the in-memory graph.
- `resolveSurfaceSlice` (ghost-core/surfaces/resolve.ts) — **this is `gather`**: walks
  the ancestor chain + one-hop typed edges, already tracks `SliceProvenance`
  ("own" / "ancestor" / "edge").
- `surfaces.yml` (ghost-core/surfaces/types.ts) — already the tree: `parent`
  (= our `under`), typed `edges` (= our `relates`, closed vocab
  `composes`/`governed-by`), implicit `core` root.
- Checks already route separately (check/route.ts, selectChecksForSurfaces,
  groundSurface).

**Every read consumer works on the in-memory object and never reads files.** So
the model change is contained to: the node shape, the loader, and the writers —
exactly as `contract-storage.md` predicted.

## Concept → code mapping

| Model | Today | Change |
| --- | --- | --- |
| node | typed YAML sub-objects (principle/situation/pattern/exemplar) in 3 facet files | **markdown file: frontmatter + prose body** |
| `under` | `GhostSurface.parent` + `core` root | keep; rename surface→node later |
| `relates` | `GhostSurfaceEdge` (2 kinds) | keep; widen vocab + add a qualifier |
| relationship-node | (none — only edges) | **new: a node whose body is the relationship** |
| `medium` | (none) | **new: optional frontmatter tag** |
| `gather` | `resolveSurfaceSlice` | extend with medium filter; otherwise reuse |
| checks | check/route.ts (markdown already) | add `medium` + `when` frontmatter |
| in-memory graph | `GhostFingerprintDocument` | keep shape; nodes carry body + medium |

## The three real gaps (everything else is rename/extend)

1. **Node bodies become markdown.** Today intent/inventory/composition are
   separate YAML files with typed schemas per node. New: one node = one markdown
   file; intent/inventory/composition are **body headings**, not files or types.
   The loader stops parsing typed facet objects and starts parsing
   frontmatter+body nodes.
2. **`medium` tag.** New optional frontmatter field; threads through gather
   (filter), checks (scoping), and lint (root must be medium-agnostic).
3. **Relationship-nodes.** The OKF "joins" borrow: a node that *is* a
   relationship, with endpoints in frontmatter and rationale in the body.

## Sequencing — each phase green, each shippable

### Phase 0 — one-road (prerequisite, already planned)

Build `one-road.md` first. Removes the binding + nesting, frees the path
helpers, makes `checks`/`review` take agent-stated nodes. **Do not start the
graph work until one-road lands** — it touches the same command surface and the
loader's neighbours. No overlap if sequenced; double-work if not.

### Phase 1 — the node model (schema + types, no loader yet)

The keystone, done in isolation so it can be reviewed before anything depends on
it.

- Define the **node frontmatter schema**: `id` (required), `under?`, `relates?`
  (with optional qualifier), `medium?`, plus body. One schema for *all* nodes —
  the role (principle/pattern/exemplar) is inferred from body headings, not a
  typed kind.
- Define the **relationship-node**: same envelope, frontmatter carries
  `relates: [a, b]` with no `under`; body is the rationale.
- Add `medium` as an open string enum (`any` | known media | custom).
- Define the new in-memory shape: a flat `nodes: GhostNode[]` + the existing
  tree, instead of `intent/inventory/composition` typed buckets. Keep a
  `GhostFingerprintDocument` *facade* if it reduces consumer churn.
- Unit tests on the schema only. No I/O.

### Phase 2 — the loader (the one hard change)

Rewrite `loadFingerprintPackage` / `assembleFingerprint` as a **fold over node
files**:

1. discover node markdown files in the package (glob; layout-free),
2. parse each (frontmatter + body) — reuse `scan/frontmatter.ts`, `scan/body.ts`,
3. resolve `under`/`relates` refs (local + `package#ref` — defer cross-package
   to Phase 6; local first),
4. derive inverses, assemble the graph.

Keep the output assignable to the consumer-facing document shape so
`resolveSurfaceSlice` and friends compile unchanged. **This phase is where the
"many projections" promise is paid: file layout is now free.**

### Phase 3 — gather + medium

- Extend `resolveSurfaceSlice` (→ rename `gatherNode` eventually) with an
  optional `medium` filter: a node is included if its medium is `any`/absent or
  matches the requested medium. Cascade + one-hop edges unchanged.
- Pull relationship-nodes into the slice when either endpoint is in scope
  (they're just nodes with two `relates`).
- `gather <node> [--medium m]` at the CLI.
- Provenance already exists — extend it with `medium` and `relationship-node`
  reasons so `trace` stays structural.

### Phase 4 — checks on the graph

- Checks are already markdown. Add `medium` (scope) and `when: review|runtime`
  to check frontmatter.
- `selectChecksForSurfaces` → route by `under` + medium. A check `under` a node
  applies to it and descendants; medium narrows it.
- `when: runtime` is *parsed and routed* now; runtime *execution* is out of
  scope (Scenario D future) — just don't drop it on the floor.

### Phase 5 — authoring: init, migrate, the skill

- `init` scaffolds a `core` node + 1–2 example nodes with the
  intent/inventory/composition body template (Style-Dictionary default).
- `migrate` gains facet→node re-filing: read today's typed YAML nodes, emit
  markdown nodes (carry `surface:`→`under`, fold typed fields into body
  headings).
- **The authoring skill** (first-class, not afterthought — OKF's reference-agent
  lesson): discover nodes, propose placement + links, weave links into prose,
  follow the anti-over-linking discipline. Lint guards it.

### Phase 6 — cross-package refs (B, E)

- Implement `package#ref` resolution: a `relates`/`under` target in another
  installed contract (`consumes` in manifest). Located via the surviving path
  helpers + node_modules resolution.
- This unlocks the fleet (E) and shared-brand (B). Until now everything is
  single-package.

### Phase 7 — compare / drift on the graph

- `compare` = graph diff (mostly reuses comparable-fingerprint machinery on the
  new node set).
- `drift` highest purpose: compare **siblings of a shared intent** — nodes that
  `relates` to the same parent node (E's "have these two expressions of clarity
  drifted?"). New, but small once the graph exists.

### Phase 8 — lint as the guardian

Throughout, `lint` proves the three invariants (it becomes *the* thing holding a
free-layout graph together):

1. **Identity** — every node has a unique `id`.
2. **Resolvable links** — every `under`/`relates` resolves (tolerant: dangling =
   warn "not yet written", per OKF; hard-fail only on a missing/duplicate root).
3. **One medium-agnostic root** — exactly one node with no `under`, and it is
   `medium: any`/absent.

Plus the authoring-discipline checks (no self-links, no over-linking).

## What gets deleted / folded

- The per-facet typed schemas (`intent.principle`, `composition.pattern`, …)
  collapse into one node schema. The typed sub-object types in
  `ghost-core/fingerprint/types.ts` either go away or become *body-parsing
  helpers*, not storage types.
- `survey/`, `patterns/`, `resources/` legacy modules: assess for removal once
  nodes are markdown (much of their schema work is subsumed).
- Three fixed facet files (`intent.yml`/`inventory.yml`/`composition.yml`) stop
  being the canonical input. `migrate` reads them; nothing else does.

## What does NOT change

- The seam (`files → loader → document → consumers`).
- `resolveSurfaceSlice`'s traversal logic (cascade + one-hop edges + provenance).
- Checks routing *concept* (markdown, route by placement).
- `--package` / `GHOST_PACKAGE_DIR` direct addressing.
- compare/drift's underlying comparison math.

## The machinery ring (assume it, OKF-confirmed)

OKF ships format **and** machinery; the format alone is inert. Their repo is
mostly an authorship agent (`reference_agent/`: tools + prompt), plus
parse/validate (`document.py`), an index/menu (`index.py`), an auto-summarizer
(`synthesizer.py`), a **visual viewer** (`viewer/`), and tests. Assume Ghost has
the same ring — and we already have most of it, specialized further for design.

| OKF machinery | Ghost equivalent | Status |
| --- | --- | --- |
| reference_agent (authorship) | the **ghost skill** (discover nodes, propose links, weave prose, anti-over-linking discipline) | exists; reshape for graph (Phase 5) |
| `document.py` parse/validate | `scan/frontmatter.ts`, `scan/body.ts`, node schema | exists; extend (Phase 1–2) |
| §9 conformance | `lint` — the three invariants, tolerant | exists; refocus (Phase 8) |
| `index.py` menu | `gather` (no-arg) menu / `buildSurfaceMenu` | exists |
| `synthesizer.py` summaries | scan-status / contribution | exists, partial |
| **`viewer/` visual graph** | **— gap —** a visual render of the graph (tree, links, relationship-nodes) | **future; fits the "observable" goal** |
| sources / web ingestion | (skip — we are authored/editorial, not extractive) | deliberately out |

Two takeaways: **(1) the authoring skill is first-class** (OKF's largest
component — nobody hand-authors a linked graph), and **(2) a viewer is a real
future item** — arguably more valuable for a *design* fingerprint than a data
catalog, and it serves Ghost's portable/extensible/**observable** goal.

## Open decisions that gate the build

1. **The rename — SETTLED.** Graph unit is **`node`** (machinery-only vocabulary,
   never user-facing). "surface" retired from both layers — `node` replaces it in
   code; the design prose + ids replace it for users. Wide but mechanical rename
   of `surface*` symbols (`GhostSurface`, `resolveSurfaceSlice`, `surfaces.yml`,
   `selectChecksForSurfaces`).
2. **Node body — SETTLED: free markdown, always.** intent/inventory/composition
   are **ephemeral authorship guidance** (skill prompts + maybe an `init` nudge),
   with **zero presence in schema/loader/graph/lint**. No conventional headings,
   no body schema. Nothing to build for them.
3. **One file per node vs. grouped files.** Loader is layout-free (Phase 2), so
   this is a *default-scaffold* taste call for `init`, not a parser constraint.
   Leaning one-file-per-node (one node = one concept).
4. **Keep `GhostFingerprintDocument` facade or rename to `GhostGraph`?** Facade
   reduces consumer churn; rename is honest. Lean facade during transition,
   rename at the end.
5. **`relates` qualifier vocabulary** — `contrasts`/`reinforces`/`variant`
   (+ `governs`, `expresses` seen in scenarios). Closed set, like edges today.
   Decide the starting set.

## Build order, one line

**one-road → node schema → loader fold → gather+medium → checks → authoring
(init/migrate/skill) → cross-package → compare/drift → lint-as-guardian.**
Each phase green; the node-schema and loader phases are the only hard ones; the
rest is extend-or-rename of code that already exists.
