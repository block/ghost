---
description: Make off-system output hard to express — decision names beat raw values, checks beat prose.
materials:
  - packages/vessel/src/components/**
  - packages/vessel/scripts/audit-agent-safety.mjs
---

Vessel's agent-safety discipline: **make off-system output hard to express,
not merely discouraged in prose.**

- Decision names beat values. Prefer props, variants, tokens, and registry
  metadata that name intent — `surface=card`, `tone=muted`, `density=compact`
  — over open-ended class strings and raw values. Components use CVA variants
  and `data-slot` attributes so an agent chooses a named decision instead of
  inventing local styling.
- Docs are probability; checks are contracts. When a rule can be
  deterministic — no raw palette utilities, no deleted token aliases, no
  unapproved theme bridge names — encode it as a script or check rather than
  relying on review prose.
- Theme behavior belongs in tokens. Components consume semantic roles;
  light/dark differences live in the token/theme layer wherever possible,
  never as component-local theme hacks.
- Registry metadata is part of the API. High-impact registry items carry
  decision metadata — intent, when to use, when not to use, safe variants,
  common misuses, token roles — because agents need the decision, not just
  the source.

When the same override recurs across consumers, the fix is to add a named
decision to Vessel, not to normalize the escape hatch.
