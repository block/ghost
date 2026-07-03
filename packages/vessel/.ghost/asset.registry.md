---
description: The shadcn registry is the distribution surface — copy-and-own, with decision metadata as part of the API.
materials:
  - packages/vessel/registry.json
  - packages/vessel/public/r/**
  - packages/vessel/.shadcn/skills.md
---

Vessel is distributed as a generated shadcn registry, not an npm package.
Consumers copy components into their repo and own them from there — the
escape path is visible by design.

The registry is also an agent-facing API, not just a file listing. Registry
items may carry namespaced `meta` fields, and high-impact items should:

- `meta.agent_decision` — the decision packet an agent reads before source:
  intent, when to use, when not to use, safe variants, common misuses, and
  token roles.
- `meta.fingerprint_dimensions` — which dimensions a component primarily
  expresses (`palette`, `spacing`, `typography`, `surfaces`), for
  higher-confidence per-component attribution by downstream tooling.
- `meta.exemplar_kind` and `meta.response_shapes` — for shape-aware examples:
  `atom` for primitives, `shape` for composed outputs (`article`, `tracker`,
  `comparison`, `card`).

When adding or reworking a component, regenerate the registry output rather
than hand-editing `public/r/`; the generated artifacts are derived, the
source components and `registry.json` are canonical.
