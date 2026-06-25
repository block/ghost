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
- `surface-schema.md` — the first concrete extraction. Proposes
  `ghost.surfaces/v1` as a new `surfaces.yml` facet expressing both the
  containment `parent` and typed composition `edges`, plus a field-by-field
  migration off `topology` / `applies_to` / `surface_type` / `scope` to a
  `surface:` placement pointer. Settles closed `edge_kinds`, flat ids, and
  explicit placement (no silent global default); the one remaining fork — the
  repo binding as scoped ownership — is reframed for its own note.
- `surface-binding.md` — the second concrete extraction. Settles `ghost.binding/v1`:
  the contract carries no paths, the binding owns all path matching, with
  directory location as the default binding and an explicit `.ghost.bind.yml` as
  the escape hatch. Path / prompt / diff all resolve to a surface id through one
  resolver; nesting is reframed from data-merge to binding (retiring Leak E).
  Records that this is the least proof-validated layer, so it ships smallest-first.
- `implementation-plan.md` — sequences the hard-cutover (breaking, no parallel
  model) build in dependency order across eight phases: schema → lint →
  placement → delete `ghost.map/v1` → resolver/menu → migration command →
  binding → command/skill/docs reconciliation. Marks Phase 3 (removing node
  coordinate fields) as the breaking line, with additive Phases 1–2 landed first.
- `phase-1-plan.md` — execution spec for Phase 1: the additive
  `ghost-core/surfaces/` module (`ghost.surfaces/v1` schema + types + index +
  tests), mirroring the `fingerprint/` module. Bans dotted ids at the schema
  layer; defers all graph-level validation (cycles, dangling refs) to Phase 2.
  **Shipped** (`cb2b7c4`).
- `phase-2-plan.md` — execution spec for Phase 2: `lintGhostSurfaces` graph
  validation (parent refs, tree/no-cycle, edge refs, reserved `core`, duplicate
  and near-miss ids) plus `ghost lint` dispatch for `surfaces.yml`. Edge cycles
  are allowed; only `parent` is tree-constrained. Still additive.

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
