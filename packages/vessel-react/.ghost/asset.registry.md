---
for: Changing registry distribution, registry metadata, or copy-and-own component delivery.
materials:
  - packages/vessel-react/registry.json
  - packages/vessel-react/public/r/registry.json
  - packages/vessel-react/.shadcn/skills.md
---

## Usage

Vessel is distributed as a generated shadcn registry, not an npm package.
Consumers copy components into their repo and own them from there — the
escape path is visible by design.

The registry is also an agent-facing API, not just a file listing. Registry
items may carry namespaced `meta` fields.

## Rules

- High-impact registry items carry `meta.agent_decision` — the decision
  packet an agent reads before source: intent, when to use, when not to use,
  safe variants, common misuses, and token roles.
- High-impact registry items carry `meta.fingerprint_dimensions` — which
  dimensions a component primarily expresses (`palette`, `spacing`,
  `typography`, `surfaces`), for higher-confidence per-component attribution
  by downstream tooling.
- High-impact registry items carry `meta.response_shapes` — the composed
  shapes an example demonstrates, such as `article`, `tracker`, `comparison`,
  or `card`.
- When adding or reworking a component, regenerate the registry output; the
  generated artifacts are derived, the source components and `registry.json`
  are canonical.

## Never

- Never hand-edit the generated `public/r/` artifacts — regenerate them from
  the source components and `registry.json`.
