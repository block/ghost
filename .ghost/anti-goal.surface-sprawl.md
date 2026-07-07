---
description: Guard against speculative surface area. Review-critical for changes that add commands, flags, fields, or vocabulary.
materials:
  - packages/ghost/src/commands/*.ts
  - .changeset/*.md
---

Not: shipping a field, flag, node type, hierarchy, or projection axis because
a future use case might want it. `extends`, `incarnation`, surface routing,
and the graph model all shipped unused and were all cut.

Instead: ship the smallest surface that solves an observed failure, and cut
surface that has no user. New CLI commands and flags need a changeset, a
manifest regeneration (`pnpm dump:cli-help`), and a worked example in the
skill bundle before they are real.

Recognize the switch: if a PR adds a concept that no recipe teaches and no
test exercises against a real task, the guard failed. If explaining the
feature requires new vocabulary, that vocabulary is a cost; count it.
