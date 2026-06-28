---
status: exploring
---

# Phase 6: facet removal — the graph is the only model

Sixth build phase. Delete the facet model now that authoring (Phase 5) emits
nodes and every read consumer (gather, checks, review) is on the graph. After
this, `GhostFingerprintDocument` and the `intent/inventory/composition` schemas
no longer exist; the loader folds **nodes + surfaces** into the graph directly.
Read phases 2–5 first.

## Goal and boundary

Remove the facet model end to end:

- the facet schemas/types/lint (`ghost-core/fingerprint/`),
- the facet layer parsing in the loader (`assembleFingerprint`, `layerRaw`,
  `parseLayer`),
- the facet→node projection scaffold (`projectFacetsToNodes`) — its job is done
  (it lives on as `migrate`'s writer, not as a load-time bridge),
- the now-dead `resolveSurfaceSlice` / `groundSurface` / `ground.ts` and the
  surfaces `cascade.ts` (gather/checks moved to the graph slice in phases 3–4),
- the facet `file-kind` branches (`fingerprint-intent/-inventory/-composition`).

And **reconceive the commands still facet-shaped**:

- **`lint` + `verify` → one public `validate` verb (SETTLED).** `validate` is
  internal hygiene: "is the fingerprint correct?" It runs two passes and reports
  both: a **shape pass** (each artifact well-formed on its own — the old `lint`,
  which stays the internal engineering term) and a **graph pass** (the
  ghost-specific network holds — links resolve, exactly one root, checks
  reference real surfaces, `relates` point at real nodes; later, cross-package
  refs). `verify` is absorbed (it *was* the graph pass). `lint` is no longer a
  public verb. No separate parent command — `validate` is the parent. A single
  `validate <file>` may short-circuit to the shape pass. `check`/`checks` stay
  distinct (public agent checks against generated output — a different concern).
  Capability note: the graph pass checks *reference* integrity, not *filesystem
  reality* (exemplar paths on disk died with the facet fields, per Option A).
- **`scan`** — today reports facet *contribution* (intent/inventory/composition
  counts). Re-aim at node/graph contribution.

Done when the package model is **manifest + surfaces.yml + nodes/ + checks/**
only, the loader has no facet path, all reads/writes are graph-native, and tests
pass. Legacy facet packages no longer load directly — they must be `migrate`-d
first (Phase 5 made that one command).

## The load-bearing change: the loader stops parsing facets

Today `loadFingerprintPackage`:
1. reads intent/inventory/composition/surfaces,
2. `assembleFingerprint(...)` → `GhostFingerprintDocument`,
3. lints it,
4. folds `{ nodeFiles, fingerprint, surfaces }` → graph (fingerprint projected).

New:
1. reads surfaces + `nodes/*.md`,
2. folds `{ nodeFiles, surfaces }` → graph,
3. lints the **graph** (nodes parse, links resolve, one root).

`LoadedFingerprintPackage` drops `fingerprint` and `layerRaw`; keeps `manifest`,
`surfaces?`, `graph`. `assembleGraph` drops its `fingerprint` input (projection
gone). This is the moment the in-memory model becomes graph-only.

### Migration safety

Legacy facet packages stop loading once the facet parser is gone. That is
acceptable because Phase 5's `migrate` converts them in one command, and the
canonical form is already the node package. **Detect-and-guide:** if the loader
finds `intent.yml`/`inventory.yml`/`composition.yml` and no `nodes/`, fail with
a clear "run `ghost migrate` to convert this legacy package" message rather than
a parse error. (Small, high-value: keeps the cutover humane.)

## `validate` — shape pass + graph pass

`validate` is the one hygiene verb. It assembles the package and runs:

- **shape pass** (internal `lint`): every artifact well-formed on its own — node
  frontmatter parses, check frontmatter valid, `surfaces.yml` schema-correct,
  `manifest.yml` valid.
- **graph pass** (the old `verify`'s surviving job): the network is correct —
  every `under`/`relates` resolves, exactly one root, checks' `surface:` name
  real surfaces, no orphan/dangling references.

One report, both classes of problem, one exit code. The lost capability
(filesystem exemplar-path checking) is gone with the facet fields it operated on
— flag it in the changeset. `verify` and standalone public `lint` are removed.

## Reconceiving `scan`

`scan` reports per-facet contribution (intent/inventory/composition counts +
states). Re-aim at the graph:

- **node contribution**: how many nodes, placed where (surfaces covered), how
  many essence vs incarnation-tagged, sparse surfaces (declared but no nodes).
- keep the BYOA next-step guidance, re-pointed at "add nodes for these surfaces."

`ScanFacet`/`fingerprint-contribution.ts` are rewritten to a node/surface
contribution report. This is the other real build item (not just deletion).

## Files

Delete:
- `ghost-core/fingerprint/` (schema, types, lint, index) — the facet model.
- `ghost-core/graph/project-facets.ts` (load-time projection; `migrate` keeps
  its own copy of the mapping or imports a shared one — decide while building).
- `ghost-core/surfaces/resolve.ts`, `ground.ts`, `cascade.ts` (dead since
  phases 3–4) + their tests (`surfaces-resolve`, `surfaces-ground`).

Rewrite:
- `scan/fingerprint-package-layers.ts` → node+surfaces loader only.
- `scan/fingerprint-package.ts` → `LoadedFingerprintPackage` drops
  `fingerprint`/`layerRaw`.
- `ghost-core/graph/assemble.ts` → drop the `fingerprint` projection input.
- `scan/verify-package.ts` → cross-artifact graph integrity.
- `scan/fingerprint-contribution.ts` → node/surface contribution.
- `scan/file-kind.ts` → drop facet-layer kinds; keep surfaces/check/node/manifest.
- `ghost-core/index.ts`, `fingerprint.ts` → drop facet exports.

Keep:
- `surfaces/` schema + `buildSurfaceMenu` (the spine is still YAML).
- `node/`, `graph/` (assemble, slice), `check/`.

## Tests

- Loader: a node package loads to a graph with no `fingerprint` field; a legacy
  facet package fails with the migrate-guidance message.
- `verify`: passes on a clean node package; flags a check referencing a missing
  surface / a `relates` to a missing node.
- `scan`: reports node/surface contribution (counts, sparse surfaces) — rewrite
  the existing scan assertions.
- Delete facet-model tests (`fingerprint-yml-schema` etc. — confirm which are
  pure-facet) and the dead surfaces-resolve/ground tests.
- Migrate Ghost's own dogfood packages / fixtures to nodes (or assert they are
  already node packages) so the suite runs without facet packages.

## Explicitly NOT in Phase 6

- Cross-package refs (`@scope/pkg#id`) resolution — next.
- The `surface`→`node` symbol rename.
- Graph-native compare/drift/fleet (parked; their own future effort).
- Re-adding structured evidence/exemplar fields — Option A stands; evidence
  lives in prose.

## Settled decisions

0. **`emit review-command` is DROPPED.** It is a pre-graph artifact: a frozen
   codegen of `.claude/commands/design-review.md` from facet content — a stale
   snapshot of what `review --surface` now produces live from the graph. It is
   also the heaviest remaining facet consumer (`context/package-context.ts` +
   `context/package-review-command.ts`, ~340 lines reading
   `fingerprint.intent.summary` / `inventory.building_blocks`). Drop the `emit`
   verb and both context modules outright — pure deletion, no port. Clean house.

1. **One public `validate` verb** = shape pass (internal `lint`) + graph pass
   (absorbed `verify`). `lint`/`verify` are not public verbs. `check`/`checks`
   stay distinct (agent checks against output).
2. **`projectFacetsToNodes` dies as a load-time bridge.** The facet→node *mapping*
   already lives in `migrate-legacy.ts` (`migratedNodeFiles`, Phase 5); delete
   the graph copy. Decide while building whether any shared helper is worth
   keeping (lean: no, migrate owns it).
3. **Legacy facet package → explicit `ghost migrate` guidance on load** (not a
   parse error, not a silent skip).
4. **Test fixtures are updated, not migrated.** Rewrite the fixture helpers to
   emit node packages directly (`surfaces.yml` + `nodes/*.md`); delete the
   facet-writing helpers. No shelling out to `migrate`; generate node fixtures as
   needed. Same for any of the repo's own `.ghost/` packages — regenerate as node
   packages.

## Read-back

Phase 6 succeeds when the only fingerprint model is the graph (manifest +
surfaces + nodes + checks), the loader folds nodes+surfaces with no facet path,
`verify` and `scan` are reconceived for nodes, the facet schemas/projection/dead
slice+ground are deleted, legacy packages are guided to `migrate`, and the repo's
own packages are node packages. After this, only cross-package resolution and
the symbol rename remain before the graph model is fully consolidated.
