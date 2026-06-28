# What Fingerprints Are For

Ghost has one artifact — the `.ghost/` fingerprint package — and several
consumers that read it. This page exists to keep them honest.

## The rule

> A consumer may read the fingerprint through any **projection** it likes.
> A consumer may **not** change the shape of the fingerprint or the merge
> semantics to suit itself.

The fingerprint is a deliberately dumb source of truth. It does not know who is
asking. Every purpose lives in the projection, not in the artifact.

The test for any feature that "feels bundled":

> Does serving this purpose require changing the *shape* of the fingerprint or
> its *merge semantics*?
> - **No** → it's a projection. Fine. Keep it out of the model.
> - **Yes** → that's a leak. Write it down below and fix the boundary.

## The model (does not bend)

Four facets, one job each:

| Facet | Job |
| --- | --- |
| `intent.yml` | Obligations: situations, principles, experience contracts. |
| `inventory.yml` | Material and evidence: topology, building blocks, exemplars, sources. |
| `composition.yml` | Assembly grammar: patterns. |
| `validate.yml` | Hard deterministic checks. Output validation, not generation input. |

Plus one resolution mechanism: nested packages merged root→leaf,
`child-wins-by-id`. Nesting is the **storage and ownership** model. It is *not*
the selection model.

## The consumers (each is a projection)

| Consumer | CLI surface | Projection it needs | Reads | Changes the model? |
| --- | --- | --- | --- | --- |
| **Authoring** | `init`, `scan`, `signals`, `lint`, `verify` | The raw facets + repo signals, for a human/agent writing the fingerprint. | all facets, raw signals | **No** — this *is* the model. |
| **Generation** | `relay gather --mode generation` | A narrow, task-scoped *slice* of the merged stack, delivered before building. | merged stack → `selected-context` filtered by `applies_to` / route selectors | **No** if selection stays a read-only narrowing pass. **Leak risk:** if routing needs are pushed back into merge semantics. |
| **Governance** | `check`, `review`, `relay gather --mode review` | Active checks for the changed paths, evaluated against a diff. | `merged.checks` filtered to changed paths | **No** if check-scoping is pure projection. **Leak risk:** child `status: disabled` silently suppressing an inherited `critical` gate is governance policy living in the data merge. |
| **Comparison / drift** | `compare`, `diff`, `ack`, `track`, `diverge` | The whole structure, often across *bundles*, not one repo. | full fingerprint(s), structural | **No** — read-only structural views. |
| **Fleet** | (`ghost-fleet`, private) | Many bundles at once: distances, cohorts, tracks-graph. | many merged fingerprints | **No** — consumes workspace exports read-only. |
| **Prompt-shaped / pathless** | `relay gather --mode prompt`, `--request*` | A slice selected by prompt selectors when there is no meaningful target path. | route → stack candidates → merged → slice | **Leak risk:** this is where path-based nesting degrades to global fallback. The fix is routing as a selector, not new merge behavior. |

## Known leaks (the `Yes` and `Leak risk` rows, restated)

These are the places where a consumer's need has bent, or is bending, the model.
Each is a thing to fix at the boundary — not a reason to redesign the artifact.

1. **Generation reads the merged stack too broadly.** Nothing should consume
   `merged.fingerprint` directly for generation; everything should go through
   `selected-context`. The merged stack is an *index*, not a *payload*.
   *Fix: merge to assemble, select to deliver.*

2. **Pathless tasks fall through to `global-fallback`.** Tree-walking is the
   privileged selector, so when there's no path the mechanism stops
   discriminating exactly when you want it to.
   *Fix: path is one selector among several; route by prompt selectors too.*

3. **A child can silently disable an inherited critical check.** Suppressing a
   parent's hard gate from a child folder is governance action-at-a-distance
   that is invisible in review.
   *Fix: make the suppression explicit and surface it in `review` / `diff` with
   per-layer provenance (already recorded in `provenance.layers`).*

4. **id-coupling is silent.** Overrides only happen on exact id match; a typo
   produces two contradictory entries that both merge in, with no error.
   *Fix: warn on near-miss ids during `lint`.*

5. **Low-value overlays accrue.** "Don't nest just because files differ" is
   advice no one follows.
   *Fix: `scan` / `lint --all` warns when a nested package contributes almost
   nothing the parent didn't already say.*

## What we are NOT doing

- **Not** flattening to a single fingerprint — that kills ownership locality and
  reintroduces drift.
- **Not** adding deeper inheritance (mixins, priority weights, multiple
  inheritance) — cascade-fragility grows faster than the expressive payoff. The
  whole value of the nesting model is that it is dumb and predictable.
- **Not** giving any consumer write access to the merge.

## One line

Nesting is how fingerprints are **stored and owned**; routing plus `applies_to`
filtering is how context is **selected**. One model, many projections, and the
model never bends to serve a projection.
