# Ideas

This folder is for live, non-authoritative exploration that should not be lost
to chat history but is not ready to become public docs or a changeset.

The one public doc one level up is `../purposes.md` (one model, many
projections). Older format / loop / adapter / fleet docs were deleted in a
focus pass: they described the pre-redesign Relay-routing and
`topology`/`applies_to` model that `coordinate-space.md` replaces.

## The settled center

- `fingerprint-first-architecture.md` records the settled product center:
  Ghost is fingerprint-first, and drift is one governance workflow over the
  portable `.ghost/` package. Everything below is subordinate to it.

## The reset arc (read in order)

These notes form one continuous thread from "I overcomplicated this" to a
buildable Layer 2 design. They agree; read them as a sequence.

- `../purposes.md` — one model, many projections. The artifact never bends to
  serve a consumer.
- `ghost-layers.md` — the five layers Ghost actually has (description, map,
  selection, governance, comparison), with each piece of code assigned to a
  layer and each leak named.
- `contract-and-binding.md` — the portable-contract vs repo-binding split.
  (Now mostly subsumed: the split falls out of `coordinate-space.md` for free.)
- `reset.md` — the stop-circling note. Fixes purpose, goals, layers, and
  separation of concerns, and schedules a single first move with everything
  else parked.
- `coordinate-space.md` — the clean-room design for Layer 2 (the first cut). A
  surface is an author-named group with an optional description; topology is a
  two axes — a strict containment tree (Layer 2) plus a typed composition graph
  over it (Layer 3); resolution is BYOA (Ghost emits a described menu, the agent
  matches); delete list covers `inventory.topology`, smeared `applies_to`, and
  `ghost.map/v1`.

## Independent, still live

- `ghost-ui.md` explores additive registry metadata for the private Ghost UI
  reference package. Orthogonal to the coordinate redesign.
- `guided-migration.md` explores a future host-agent workflow for migrating one
  fingerprint toward another. Layer 5 (comparison); untouched by the redesign.

## Conventions

- One file per idea, kebab-case slug.
- Add frontmatter with `status: exploring`, `status: deferred`, or
  `status: settled`.
- Keep idea notes explicitly subordinate to the current fingerprint package
  model.
- Delete notes that only describe superseded package splits, removed commands,
  or dead routing/coordinate models after their useful decisions are folded
  into current docs.
