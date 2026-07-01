---
name: schema
description: The Ghost fingerprint package shape: nodes, the directory tree, checks, and extends.
---

# Ghost Fingerprint Package Reference

Canonical package:

```text
.ghost/
  manifest.yml          ghost.fingerprint-package/v1: id + optional extends
  index.md              the core node, true everywhere (optional)
  <surface>/index.md    a surface's own prose (the directory is the surface)
  <surface>/<node>.md   ghost.node/v1: a node placed in that surface
  checks/*.md           optional ghost.check/v1: agent-evaluated output checks
```

The **directory tree is the graph**: a node's id is its path and its parent is
its containing directory. A surface is a directory; its own prose is its
`index.md`. The package-root `index.md` is the implicit `core` node. Reserved at
the root: `manifest.yml` and `checks/`; every other `*.md` is a node.

Git is the approval boundary: checked-in files are canonical; uncommitted or
unmerged edits are draft work. One contract per package; the contract carries no
paths and infers nothing from repo location.

## Nodes

A node is the unit: a markdown file with descriptive frontmatter + a prose
body. Identity and containment are not in the frontmatter; they are where the
file sits. A node at `checkout/trust.md`:

```yaml
---
description: Trust at the payment moment.   # the retrieval payload
relates:                      # optional lateral links
  - to: core/trust
    as: reinforces            # reinforces | contrasts | variant
# free-form keys (audience, stage, …) pass through untouched
---
Prose design expression. Intent / inventory / composition are authoring
lenses, not fields.
```

`description` is how an agent selects a node (like a tool's name + description).
The file's location places it: `checkout/trust.md` has id `checkout/trust` and
is inherited downward from `checkout` (`core` is the implicit root that reaches
everywhere). `relates` links nodes laterally. The tree is the layout; ids encode
hierarchy because they *are* paths.

## Surfaces are directories

No separate file declares the graph. A surface exists when its directory exists; give it prose
with an `index.md`, place nodes inside it, and nest surfaces by nesting
directories. A surface that needs no prose of its own is simply a directory that
holds nodes. Moving a node to another directory changes its id (a rename) and
its parent; `ghost validate` reports any `relates` that no longer resolve.

## Manifest + extends

```yaml
schema: ghost.fingerprint-package/v1
id: acme-checkout
extends:
  brand: ../brand/.ghost      # inherit another contract's nodes, by identity
```

A `brand:core/trust` ref in `relates` resolves into the extended package's nodes
(read-only), a `<package>:<path>` ref. Reference is by identity (the `extends`
key), never by repo path.

## Gather

`ghost gather <node>` composes a node's slice:

- **full bodies along the path**: every file from the package root down to the
  node's own folder. Sibling folders never appear.
- **edges** (full bodies, one hop): the `relates` targets of every node on that
  path. A rule authored high in the tree (e.g. `relates: { to: arcade }` on
  `features/`) reaches every descendant.
- **pointers**: the node's own descendants and the subtree of any node it
  relates to, offered as id + description for the agent to pull with a
  follow-up `gather`.

With no argument, `gather` lists nodes by id + description for the agent to match
the ask against. The agent names the node; Ghost never infers it from a path.

## Checks

`checks/*.md` are `ghost.check/v1` markdown. Every check is offered to the
reviewer; the host agent judges which apply to the diff and the grounded prose.
An optional `source:` names the fingerprint prose the check enforces: a node
path id with an optional `> Heading` anchor (`checkout/payment > Confirmation`).
`review` surfaces it so a finding can cite which section it derives from.
`source:` is a soft pointer: an unresolved one is a warning, not an error.
Checks validate generated output; they are not generation input. Keep them
deterministic.
