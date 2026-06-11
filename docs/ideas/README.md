# Ideas

This folder is for live, non-authoritative exploration that should not be lost
to chat history but is not ready to become public docs or a changeset.

Current public docs live one level up:

- [Portable fingerprint format](../fingerprint-format.md)
- [Generation loop](../generation-loop.md)
- [Host adapter integration](../host-adapters.md)
- [Ghost Fleet](../ghost-fleet.md)

Retained notes:

- `fingerprint-first-architecture.md` records the settled product center:
  Ghost is fingerprint-first, and drift is one governance workflow over the
  portable `.ghost/fingerprint/` package.
- `ghost-workbench.md` explores a separate safe local inspector and playground
  for the fingerprint lifecycle, starting with canned context scenarios.
- `ghost-ui.md` explores additive registry metadata for the private Ghost UI
  reference package.
- `guided-migration.md` explores a future host-agent workflow for migrating one
  fingerprint toward another.

Conventions:

- One file per idea, kebab-case slug.
- Add frontmatter with `status: exploring`, `status: deferred`, or
  `status: settled`.
- Keep idea notes explicitly subordinate to the current fingerprint package
  model.
- Delete notes that only describe superseded package splits, removed commands,
  or dead migration plans after their useful decisions are folded into current
  docs.
