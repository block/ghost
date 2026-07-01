# Architecture: What Fingerprints Are For

> **Audience: Ghost maintainers and contributors.** This is the internal model
> doc — it defends the boundary between the fingerprint artifact and the
> consumers that read it. It is not an onboarding guide and it assumes the full
> vocabulary (projection, leak, path inheritance). If you are adopting Ghost,
> start with [Five-Minute Ghost](../apps/docs/src/content/docs/quickstart.mdx)
> and [Getting Started](../apps/docs/src/content/docs/getting-started.mdx)
> instead; come back here when you want to change the model, not use it.

Ghost has one artifact, the `.ghost/` fingerprint package, and several consumers
that read it. This page exists to keep them honest.

## The rule

> A consumer may read the fingerprint through any **projection** it likes.
> A consumer may **not** change the shape of the fingerprint to suit itself.

The fingerprint is a deliberately dumb source of truth. It does not know who is
asking. Every purpose lives in the projection, not in the artifact.

The test for any feature that "feels bundled":

> Does serving this purpose require changing the *shape* of the fingerprint: the
> directory tree, the node frontmatter, or the path-inheritance rules?
> - **No** then it is a projection. Fine. Keep it out of the model.
> - **Yes** then that is a leak. Write it down below and fix the boundary.

## The model (does not bend)

The package is a **directory tree of prose nodes**. The tree is the graph: a
node is a markdown file, its id is its path with `.md` dropped
(`marketing/email.md` is `marketing/email`), and its parent is the directory
that contains it. A surface is a directory; its own prose lives in that
directory's `index.md`, and the package-root `index.md` is the implicit `core`
node. No separate file declares the graph.

| Part | Job |
| --- | --- |
| `manifest.yml` | Schema version and package id. |
| Prose nodes (`index.md`, `<surface>/<node>.md`) | The durable surface composition, written through three authoring **lenses**: intent (the why), inventory (the materials), composition (the patterns). The lenses guide what to capture; they are not fields. |
| Node frontmatter | `description` (the retrieval payload), `relates` (lateral links by id). |
| `checks/*.md` | Optional `ghost.check/v1` checks. They validate output, not generation input. A check binds to the prose it enforces through an optional `source:` pointer, never by surface routing. |

One resolution mechanism, read-only:

- **Path inheritance.** A node inherits every file from the package root down to
  its own folder, so a rule authored once high in the tree reaches every
  descendant while a sibling surface stays invisible. `relates` links nodes
  laterally across folders when a relationship carries rationale.

## The consumers (each is a projection)

| Consumer | CLI surface | Projection it needs | Reads | Changes the model? |
| --- | --- | --- | --- | --- |
| **Authoring** | `init`, `validate`, `migrate` | The raw nodes, for a human or agent writing the fingerprint. The agent does its own repo reconnaissance. | the node graph | **No**, this *is* the model. |
| **Generation** | `gather` | A narrow, task-scoped *slice* delivered before building: full bodies along the surface's path, one-hop edges, and pointers. | the composed `gather` slice | **No** if selection stays a read-only narrowing pass. **Leak risk:** if retrieval needs are pushed back into the tree shape. |
| **Governance** | `checks`, `review` | Every check offered, grounded in the touched surfaces' slice, evaluated against a diff. | offered checks plus the grounding slice | **No** if checks stay offered-and-grounded. **Leak risk:** making checks filter or route by surface instead of binding to prose via `source:`. |
| **Fleet** | (`ghost-fleet`, private) | Many bundles at once: distances, cohorts, tracks-graph. | many fingerprints, read-only | **No**, consumes workspace exports read-only. |
| **Discovery / pathless** | `gather <query>` | A ranked set of candidate nodes when there is no exact surface to name. | `description` payloads, ranked | **Leak risk:** inventing a routing model in the data instead of ranking on `description` and letting the agent pick. |

## Known leaks (the `Leak risk` rows, restated)

These are the places where a consumer's need could bend the model. Each is a
thing to fix at the boundary, not a reason to redesign the artifact.

1. **Generation reads the whole tree too broadly.** Nothing should consume the
   raw graph for generation; everything should go through the `gather` slice.
   The tree is an *index*, not a *payload*.
   *Fix: compose to assemble, slice to deliver.*

2. **Pathless tasks need a target.** When there is no exact surface to name,
   `gather` lists the node menu (id + `description`) and the agent picks; an
   inexact `gather <query>` returns that same menu plus closest-id suggestions.
   The mechanism must not invent surface routing to compensate.
   *Fix: `description` is the retrieval payload; show the menu and let the agent pick.*

3. **A check could be made to route by surface.** Checks bind to prose through
   their `source:` pointer; every check is offered and the agent decides which
   apply. Filtering or routing checks by surface is governance policy leaking
   into selection.
   *Fix: keep checks offered-and-grounded; bind to prose via `source:`.*

4. **id-coupling is silent.** `relates` links resolve by
   id; a typo points at nothing.
   *Fix: `validate` reports unresolved links and a `source:` that does not
   resolve (a soft warning, not an error).*

5. **Low-value nodes accrue.** "Don't add a node just to restate what it
   inherits" is advice no one follows.
   *Fix: `gather` makes inherited context explicit (own / ancestor / edge
   provenance), so a node that says nothing the nodes above it did not already
   say is visible.*

## What we are NOT doing

- **Not** collapsing the tree into one node; that kills ownership locality and
  the reach of path inheritance.
- **Not** adding deeper inheritance (mixins, priority weights, multiple
  inheritance); cascade-fragility grows faster than the expressive payoff. The
  whole value of path inheritance is that it is dumb and predictable.
- **Not** giving any consumer write access to the shape of the tree.

## One line

The directory tree is how fingerprints are **stored and owned**; path
inheritance plus `gather` is how context is **selected**. One model, many
projections, and the model never bends to serve a projection.
