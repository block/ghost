# Fingerprint YAML Reset Plans

This planning note is superseded by the `ghost.fingerprint/v1` model described
in [docs/fingerprint-format.md](../fingerprint-format.md).

The current model is intentionally three-layered:

- `prose` explains what matters and why.
- `inventory` points to building blocks and exemplars the agent can inspect or
  use.
- `composition` explains how those blocks become experience through patterns,
  rules, layouts, structures, flows, states, content, behavior, and visual
  arrangements.

Checks now use `ghost.checks/v1` and cite fingerprint refs through
`derivation` groups. Active checks require at least one prose or composition
grounding; inventory can support a check but cannot be the only active
grounding.
