---
status: exploring
---

# Surface schema: the first extraction

This note is subordinate to `fingerprint-first-architecture.md` (settled) and is
the first concrete cut named by `reset.md` and designed by `coordinate-space.md`.
It turns the prose shape in `coordinate-space.md` into a proposed schema, on
disk, with a migration path off `topology` / `applies_to` / `surface_type` /
`scope`. It proposes one new schema; it changes no code in this note.

The design decisions are settled by `coordinate-space.md` and not reopened here:
a surface is an author-named group; grouping is placement not tags; containment
is a strict tree (Layer 2); composition is a typed reference graph over it
(Layer 3); resolution is BYOA. This note only asks: **what does that look like as
a file an author writes and the CLI validates?**

## What must be expressed

From `coordinate-space.md`, a surface needs:

- **id / name** — author's slug-shaped label.
- **description** — optional, natural language, agent-draftable.
- **parent** — at most one (the containment tree, Layer 2).
- **slice** — the nodes placed in this surface (placement, not tags).
- **edges** — typed references to nodes in other surfaces (the composition
  graph, Layer 3).

The schema must hold both axes without conflating them: parent is containment,
edges are composition.

## Where surfaces live on disk

`coordinate-space.md` makes the coordinate space its own Layer 2 artifact,
distinct from the description facets. The on-disk choice should follow that:
**a new facet file, `surfaces.yml`, anchored by the existing `manifest.yml`.**

```text
.ghost/
  manifest.yml        # ghost.fingerprint-package/v1 (unchanged)
  surfaces.yml        # ghost.surfaces/v1 (new) — the coordinate space
  intent.yml          # ghost.intent/v1 — description content (unchanged)
  inventory.yml       # ghost.inventory/v1 — minus topology
  composition.yml     # ghost.composition/v1 — patterns minus applies_to
  validate.yml        # ghost.validate/v1 — checks minus applies_to
```

Rationale for a new file over extending an existing one:

- It is a different layer; `purposes.md` says a new purpose gets its own home,
  never a new field on a description facet.
- It keeps the description facets' content constant (the point-1 fix) — they
  lose only their coordinate annotations.
- It is additive: a package with no `surfaces.yml` has a single implicit `core`
  surface and behaves exactly as today. Migration is opt-in.

New schema literal: `ghost.surfaces/v1`. (Sits alongside the existing facet
literals `ghost.intent/v1`, `ghost.inventory/v1`, `ghost.composition/v1`,
`ghost.validate/v1`.)

## Proposed shape

`surfaces.yml`:

```yaml
schema: ghost.surfaces/v1

# Edge kinds are a fixed, Ghost-owned set (see "edge_kinds is closed" below).
# Not authored per-package; listed in the schema, not in surfaces.yml.

surfaces:
  # core is implicit and always present; declare it only to describe it.
  - id: core
    description: True everywhere. Brand-wide intent, inventory, and patterns.

  - id: email
    description: Transactional and lifecycle email.
    parent: core

  - id: email-marketing
    description: Promotional email; campaign voice and offer framing.
    parent: email           # the tree lives here, not in the id

  - id: checkout
    description: The purchase decision surface.
    parent: core
    # Composition graph: a typed edge to a peer surface, not a parent.
    edges:
      - kind: composes
        to: payments
      - kind: governed-by
        to: consent
```

Field rules:

- `id` — a flat, unique, slug-shaped label with **no structural meaning**. Dots
  are not allowed as hierarchy: the tree lives only in `parent`, never in the
  id. `email-marketing` is a name; `email.marketing` is banned because the dot
  would pretend to be a `parent` link. One source of truth for the tree.
- `parent` — optional; absent means a top-level surface under the implicit
  `core` root. Exactly one parent (strict tree; no arrays). **This is the only
  place containment is expressed.**
- `description` — optional string. Present when the name is not self-evident.
- `edges` — optional; each has `kind` (must be one of the Ghost-owned
  `edge_kinds`) and `to` (an existing surface id). Edges are the composition
  graph; they never imply containment and never cascade.

`edge_kinds` are **not** declared per-package. They are a fixed, Ghost-owned set
(see below), so `surfaces.yml` references kinds but never defines them.

## `edge_kinds` is closed (settled)

The edge vocabulary is a **closed, Ghost-owned set**, not author-extensible.
This was an open fork; it is now decided, because opening it is the exact thing
that loses the plot.

An open vocabulary means the *author* defines what an edge means, which means
Ghost has no opinion about edges, which means Ghost is a general-purpose graph
database. That is unbounded scope — the sprawl the reset exists to end. Closing
the set forces Ghost to commit to what edges are *for*, and for a fingerprint-
first, interface-composition tool the answer is small: edges express how
interface surfaces relate. A starting set:

- `composes` — this surface assembles the referenced surface into its output.
- `governed-by` — this surface must satisfy the referenced surface's
  obligations.

The discipline rule that comes with closing it:

> If you cannot name an edge kind from the interface-composition domain, it does
> not belong in Ghost. The temptation to add a non-interface edge kind is the
> signal that the work has drifted toward a general world-model graph — which is
> a consumer's job, not Ghost's.

**The boundary for richer consumers.** A composition-heavy consumer (a typed
unit graph with many relationship kinds) will legitimately want edge kinds Ghost
does not ship. That is expected: such inputs are domain-shaped, Ghost is
interface-shaped. The resolution is that the consumer extends edges *in the
consumer*, not by opening Ghost's set. Ghost's closed set is the interface
vocabulary; anything beyond it is consumer-local extension. This keeps Ghost
small and keeps the consumer free.

## How nodes attach to surfaces (placement, not tags)

`coordinate-space.md` says a node's surface is *where it is stored*. Two on-disk
options; this note recommends the first and flags the second as the larger
follow-on:

1. **Per-surface placement field, minimal change (recommended first cut).**
   Description nodes keep living in `intent.yml` / `inventory.yml` /
   `composition.yml`, but their coordinate annotations (`applies_to`,
   `surface_type`, `scope`) are removed and replaced by a single `surface: <id>`
   placement key. Default when absent is `core`. This is the smallest honest
   step: it deletes the smeared DAG and replaces it with one placement pointer,
   without restructuring the facet files.

2. **Storage-by-location, full model (follow-on note).** Nodes physically live
   under the surface they belong to (nested facet files per surface). Truest to
   "placement is location," but it restructures the package layout and should be
   its own proposal. Do not attempt it in the first cut.

The first cut keeps the flat facet files and changes annotations to a placement
pointer. That is enough to kill Leak A and validate the tree + graph model
before committing to a layout change.

## The migration (off the dead coordinate systems)

What `coordinate-space.md` deletes, expressed as concrete field moves:

| Today (delete) | Becomes |
| --- | --- |
| `inventory.topology.scopes[]` | `surfaces.yml` surfaces with `parent` links |
| `inventory.topology.surface_types[]` | folded into surfaces (a surface *is* the type) |
| `exemplar.surface_type` / `exemplar.scope` | `exemplar.surface: <id>` placement |
| `principle.applies_to` / `pattern.applies_to` / `contract.applies_to` | node `surface: <id>` placement + cascade |
| `check.applies_to` | check `surface: <id>` placement |
| `ghost.map/v1` (`map.md`, `ghost-core/map/`) | `ghost.surfaces/v1` |

Worked example, from this repo's own dogfood `.ghost/inventory.yml`:

```yaml
# before — topology + smeared coordinates
topology:
  scopes:
    - id: docs-site
      paths: [docs, README.md, apps/docs]
      surface_types: [docs-home, docs-foundation, tool-doc]
exemplars:
  - id: public-readme-fingerprint-model
    surface_type: docs-home
    scope: docs-site
```

```yaml
# after — surfaces.yml owns the tree; exemplar just places itself
# surfaces.yml
surfaces:
  - id: docs
    description: The docs site and public README.
    parent: core
exemplars:                       # in inventory.yml, coordinates gone
  - id: public-readme-fingerprint-model
    surface: docs
```

Note `paths` disappeared from the surface in the no-repo model — path is
*evidence the host maps to a surface*, not part of the surface definition
(`coordinate-space.md`: medium-agnostic, designed from the no-repo case). Path →
surface mapping is a binding/governance concern (Layer 3/4), proposed separately;
the surface itself does not carry repo paths.

## Validation (lint obligations, not code)

`ghost lint` on `ghost.surfaces/v1` should enforce:

- every `parent` references an existing surface id; no cycles (it is a tree);
- exactly one parent per surface (no parent arrays);
- every surface `id` is a flat slug with no dots (dots-as-hierarchy is a lint
  error; the tree lives only in `parent`);
- every edge `kind` is one of the fixed Ghost-owned `edge_kinds`; every edge `to`
  is an existing surface;
- every node `surface:` placement references an existing surface (warn on
  near-miss ids, per `purposes.md` leak #4);
- `core` is reserved as the implicit root.

Composition edges are explicitly allowed to form a graph (including cross-links);
only `parent` is constrained to a tree. This is the two-axis rule made into lint.

## What stays stable

Per `coordinate-space.md` and `reset.md`, hold these contracts while extracting:
`ghost.fingerprint/v1`, `ghost.validate/v1`, `ghost.fingerprint-package/v1`,
`ghost.check-report/v1`. `ghost.surfaces/v1` is new and additive; absent
`surfaces.yml` keeps today's single-`core` behavior.

Layer 1 content (intent / inventory / composition prose) does not change. Only
coordinate annotations move to a `surface:` placement pointer.

## Settled in this note

- **`edge_kinds` is closed and Ghost-owned.** See "`edge_kinds` is closed"
  above. Authors reference kinds; they never define them. Richer consumers
  extend edges consumer-side, not by opening Ghost's set.
- **IDs are flat; the tree lives only in `parent`.** Dotted ids as hierarchy are
  banned (a lint error). One source of truth for containment, killing the Leak C
  duplicate-vocabulary risk before it starts.

## Open forks (decide before code)

1. **`surface:` default.** Absent placement defaults to `core`. Confirm that an
   un-placed node cascading from root is the desired default rather than a lint
   warning that forces explicit placement.
2. **Where path→surface mapping lives.** Out of scope here by design, but it is
   the next note: the repo-side binding that turns a target path or diff into a
   surface for outcomes 1 & 2. `surfaces.yml` stays repo-agnostic.

## Not a plan

This note proposes `ghost.surfaces/v1`, its on-disk home, the placement-pointer
migration, and the lint obligations. It writes no Zod, renames no command, and
moves no field today. Implementation — the schema module, the lint rules, the
`surfaces.yml` loader, the migration of this repo's own `.ghost/` — is the next
cut, proposed in its own note and linked back here.

## Read-back

This note succeeds if:

- A surface is one file (`surfaces.yml`) an author can write and a human can
  review in Git.
- The schema expresses both axes: `parent` (containment tree) and `edges`
  (typed composition graph), without conflating them.
- The migration off `topology` / `applies_to` / `surface_type` / `scope` is a
  concrete field-by-field move, not a rewrite.
- The first cut keeps flat facet files and changes annotations to a `surface:`
  pointer — small enough to ship and prove before any layout change.
- Nothing in the stable contracts has to change to add `ghost.surfaces/v1`.
