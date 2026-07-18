---
name: cli-examples-match-manifest
description: CLI examples and generated docs stay synchronized with the real ghost command surface.
severity: high
references:
  - condition.cli-reference-exactness
  - asset.docs-materials
---

When a change touches CLI docs, generated command help, command implementation,
or examples in MDX, verify that documented command names and flags exist in the
current CLI manifest or command help. If command metadata changed, require
`pnpm dump:cli-help` so `apps/docs/src/generated/cli-manifest.json` is updated.

Flag speculative flags, obsolete command names, or examples that describe a skill
workflow as though it were a CLI command.
