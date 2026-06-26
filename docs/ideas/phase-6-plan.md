---
status: exploring
---

# Phase 6 plan: the migration command

Execution spec for Phase 6 of `implementation-plan.md`. A one-shot transform that
moves a legacy `.ghost/` (pre-surface coordinates) onto the surface model:
derive `surfaces.yml` from old `topology.scopes`, rewrite node `applies_to` /
`surface_type` / `scope` into `surface:` placement. Additive, low-risk, no
consumer rewiring.

## Scope correction from the plan

The plan's headline sub-task was "migrate this repo's own dogfood `.ghost/`."
**That no longer applies** — this repo's root `.ghost/` was deleted during the
reset cleanup, and `ghost-ui/.ghost/` was already hand-migrated in Phase 3. So
Phase 6 is **only the command + its tests**, for the benefit of *external* users
with legacy packages. There is nothing in this repo left to migrate.

This also means Phase 6 is purely additive and carries no risk to the build: it
reads legacy YAML and writes new YAML; it changes no runtime path.

## What it transforms

A legacy package (pre-`ghost.fingerprint/v1` Phase-3 shape) has, in its raw
facet files:

- `inventory.yml`: `topology.scopes[] = { id, paths, surface_types }` and a
  top-level `topology.surface_types`.
- `inventory.yml` exemplars: `surface_type`, `scope`.
- `intent.yml` situations: `surface_type`.
- `intent.yml` principles / experience_contracts and `composition.yml`
  patterns: `applies_to = { scopes, paths, surface_types, situations }`.

The migrator produces:

- a new `surfaces.yml` (`ghost.surfaces/v1`) whose surfaces are derived from
  `topology.scopes` (one surface per scope id, `parent: core`, description left
  for the author or synthesized from the scope id);
- rewritten facet files where each node gains a single `surface:` placement and
  drops the legacy coordinate fields.

## The placement-derivation rule (best-effort, deterministic)

A node's new `surface:` is chosen from its legacy coordinates, in priority
order:

1. an explicit single `scope` (exemplars) → that scope id;
2. `applies_to.scopes[0]` if exactly one scope → that scope id;
3. otherwise → unplaced (omit `surface:`), and **record it for human review**.

`surface_type` does **not** map to placement — surface_type was a cross-cutting
tag, not a containment home, and the surface model has no surface_type concept.
The migrator drops it and notes any node that had *only* a surface_type (no
scope) as needing manual placement. `applies_to.paths` likewise does not map to
a node placement; paths are repo-binding concerns (Phase 7), recorded in the
report, not silently dropped into a surface.

Ambiguity (multiple scopes on one node) is **not** auto-resolved — the migrator
places nothing and reports it, because guessing would silently mis-place a node
and reintroduce the brand-mixing risk the model exists to prevent.

## Why raw-YAML, not the parsed model

The current `GhostFingerprintSchema` **rejects** `topology` / `applies_to` /
`surface_type` / `scope` (Phase 3 made them `.strict()` failures). So a legacy
package no longer parses. The migrator must operate on **raw parsed YAML**
(`yaml.parse` → plain objects), transform, and re-serialize — it cannot use the
package loader. This is the key implementation constraint.

## Deliverable

1. A migration function in `scan/` (e.g. `scan/migrate-legacy.ts`):
   `migrateLegacyPackage(dir): { surfaces, intent, inventory, composition,
   report }` — pure transform over parsed YAML, returns new doc objects plus a
   `MigrationReport` of unplaced/ambiguous nodes and dropped fields. No writes.
2. A `ghost migrate [dir]` command wrapping it: reads the legacy facet files,
   runs the transform, writes the new `surfaces.yml` and rewritten facets
   (guarded by `--force` like `init`, or `--dry-run` to print the plan), and
   prints the report.
3. The migrated package must pass `ghost lint` (surfaces graph + placement) —
   the migrator's own acceptance check.

## Command shape

- `ghost migrate [dir]` (default `./.ghost`).
- `--dry-run` — print the derived `surfaces.yml` and the report; write nothing.
- `--force` — overwrite existing facet files (a legacy package is being
  rewritten in place; without `--force`, refuse if files would change, like
  `init`).
- `--format <cli|json>` — the report format.
- Exit non-zero if the migration produced lint errors in the result; exit 0 with
  warnings for unplaced/ambiguous nodes (human-review items, not failures).

## Tests

- A legacy fixture (the pre-Phase-3 shape — `topology.scopes`, node
  `applies_to` / `surface_type` / `scope`) migrates to:
  - a valid `surfaces.yml` with one surface per legacy scope;
  - facet files where single-scope nodes carry the right `surface:` and legacy
    fields are gone;
  - a report listing surface_type-only and multi-scope nodes as unplaced.
- The migrated package passes `lintGhostFingerprint` (with the derived surface
  ids) and `lintGhostSurfaces`.
- `--dry-run` writes nothing.
- Ambiguous (multi-scope) node → unplaced + reported, never guessed.
- Full `pnpm test` (hook-enforced) green.

## Scope boundary (what Phase 6 does NOT do)

- **No path binding.** `applies_to.paths` is reported, not converted — path →
  surface binding is Phase 7.
- **No surface descriptions authored.** Surfaces get ids (and maybe a
  slug-derived description); rich descriptions are the author's job, possibly
  agent-drafted later.
- **No survey/patterns/map migration.** Those legacy schemas are separate; map
  is already deleted. Only the three description facets + surfaces.
- Does not touch this repo's packages (none need it).

## Changeset

`minor` — `ghost migrate` is a new additive command.

## Process notes

- Pure transform first (testable on in-memory parsed YAML), command wrapper
  second.
- Reuse `yaml` parse/stringify already used across `scan/`.
- Report-don't-guess is the core discipline: anything the migrator cannot place
  unambiguously is surfaced for human review, never auto-placed.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Phase 6 succeeds if `ghost migrate` turns a legacy `.ghost/` into a valid
surface-model package — `surfaces.yml` from old scopes, single-scope nodes
placed, legacy coordinate fields removed — while reporting (never guessing)
every node it could not place unambiguously, and the result passes lint.
