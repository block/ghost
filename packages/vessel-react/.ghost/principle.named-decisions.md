---
for: Authoring or reviewing components, tokens, variants, or agent-safety checks.
materials:
  - packages/vessel-react/scripts/audit-agent-safety.mjs
---

## Usage

Vessel's agent-safety discipline: **make off-system output hard to express,
not merely discouraged in prose.** Decision names beat values. Docs are
probability; checks are contracts.

## Rules

- Prefer props, variants, tokens, and registry metadata that name intent —
  `surface=card`, `tone=muted`, `density=compact` — over open-ended class
  strings and raw values.
- Components use CVA variants and `data-slot` attributes so an agent chooses
  a named decision instead of inventing local styling.
- When a rule can be deterministic — no raw palette utilities, no deleted
  token aliases, no unapproved theme bridge names — encode it as a script or
  check rather than relying on review prose.
- Theme behavior belongs in tokens. Components consume semantic roles;
  light/dark differences live in the token/theme layer wherever possible.
- Registry metadata is part of the API. High-impact registry items carry
  decision metadata — intent, when to use, when not to use, safe variants,
  common misuses, token roles — because agents need the decision, not just
  the source.

## Never

- Never implement light/dark differences as component-local theme hacks —
  they live in the token/theme layer.
- Never normalize a recurring escape hatch — when the same override recurs
  across consumers, the fix is to add a named decision to Vessel.
