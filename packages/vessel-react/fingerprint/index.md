---
description: "Always read first: what this vendored ghost package is, what it governs, and that this repo's own nodes always win."
materials:
  - "**/styles/main.css"
---

This ghost package ships with the Vessel component set. It is not a brand. It is
the taste floor: the contracts, usage grammar, and anti-goals that keep the
vendored components coherent as this repo builds on and modifies them.

The components are owned-after-copy, and so is this package. Edit these
nodes when this repo's decisions diverge; delete nodes that stop being true.
A node authored by this repo overrides anything here — these are reference
defaults, not law.

The contract is narrow. Author against the semantic token roles, never raw
palette values. Compose from the vendored components before writing new ones.
When a new component or variant is needed, it should come from observed
repeated need, not anticipation — and it should be reviewed against the
contracts here.

Vanilla is a binding, not the language. The theming contract names which
seams a theme may rebind and which relationships must hold regardless. Restyle
freely at the seams; do not fork the grammar silently.

This package deliberately carries no product stance, flows, copy, or trust
obligations. Author those as this repo's own nodes, next to these.

After vendoring, verify the materials globs in each node resolve against this
repo's actual component paths and tighten them, then run `ghost validate`.
