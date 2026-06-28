---
name: schema
description: The Ghost fingerprint package shape — nodes, the spine, checks, and extends.
---

# Ghost Fingerprint Package Reference

Canonical package:

```text
.ghost/
  manifest.yml      ghost.fingerprint-package/v1 — id + optional extends
  nodes/*.md        ghost.node/v1 — the design expression (the unit)
  surfaces.yml      optional ghost.surfaces/v1 — a terse spine (id + parent)
  checks/*.md       optional ghost.check/v1 — agent-evaluated output checks
```

Git is the approval boundary: checked-in files are canonical; uncommitted or
unmerged edits are draft work. One contract per package; the contract carries no
paths and infers nothing from repo location.

## Nodes

A node is the unit — a markdown file with frontmatter + a prose body:

```yaml
---
id: checkout-trust            # required, unique
description: Trust at the payment moment.   # the retrieval payload
under: checkout               # optional parent (inherited downward)
relates:                      # optional lateral links
  - to: core-trust
    as: reinforces            # reinforces | contrasts | variant
incarnation: web              # optional: email | billboard | voice | … (omit = essence)
# free-form keys (audience, stage, …) pass through untouched
---
Prose design expression. Intent / inventory / composition are authoring
lenses, not fields.
```

`description` is how an agent selects a node (like a tool's name + description).
`under` places the node so it is inherited downward (`core` is the implicit root that
reaches everywhere). `relates` links nodes laterally. `incarnation` tags a
medium-bound expression. The tree lives only in `under`/`surfaces.yml`, never in
the id and never inferred from a path.

## The spine (optional)

`surfaces.yml` is a terse place to declare bare tree positions (id + parent +
optional description) in one file instead of as bodyless node files. It folds
into the same node id space — a position that needs guidance is just a node with
that id.

```yaml
schema: ghost.surfaces/v1
surfaces:
  - id: checkout
    parent: core
    description: The purchase flow.
```

## Manifest + extends

```yaml
schema: ghost.fingerprint-package/v1
id: acme-checkout
extends:
  brand: ../brand/.ghost      # inherit another contract's nodes, by identity
```

A `brand:core-trust` ref in `under`/`relates` resolves into the extended
package's nodes (read-only). Reference is by identity (the `extends` key), never
by path.

## Gather

`ghost gather <node>` composes a node's slice: its own body + inherited
ancestors + one-hop `relates`, filtered by `--as <incarnation>`. With no
argument, `gather` lists nodes by id + description for the agent to match the ask
against. The agent names the node; Ghost never infers it from a path.

## Checks

`checks/*.md` are `ghost.check/v1` markdown, placed by `surface:` frontmatter
(unplaced = core = everywhere), routed to touched nodes. They validate generated
output; they are not generation input. Keep them deterministic.
