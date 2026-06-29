---
status: exploring
---

# Phase 4 plan: delete `ghost.map/v1`

This note is the execution spec for Phase 4 of `implementation-plan.md`. It
removes the `map.md` / `ghost.map/v1` coordinate-and-routing layer, which Phase 3
already made dormant (`mapFromFingerprint` returns empty, check scope grounding
is inert). Phase 4 is the deletion that makes that dormancy permanent. Part of
the major release that Phase 3 began.

## The key finding: the map module is two things tangled together

A full read shows `ghost-core/map/` is **not** one concern. It holds:

1. **The routing/coordinate layer (DELETE).** `MapFrontmatter`, `MapScope`,
   `MapFrontmatterSchema`, `getEffectiveMapScopes`, `slugifyScopeId`,
   `MAP_FILENAME`, `REQUIRED_BODY_SECTIONS` — the `map.md` schema and the
   path→scope routing it feeds. This is the legacy coordinate space the surfaces
   model replaces.

2. **Inventory-output types (RELOCATE, do not delete).** `GitInfo`,
   `InventoryOutput`, `LanguageHistogramEntry`, `TopLevelEntry` happen to live in
   `map/types.ts` but are **the output shape of `ghost signals` / inventory
   scanning** — nothing to do with map routing. `scan/inventory.ts` imports them.
   These must survive Phase 4, relocated out of the map module.

The plan's first job is to separate these two, or Phase 4 deletes types that
inventory scanning still needs.

## Step 1 — relocate the inventory-output types

Move `GitInfo`, `InventoryOutput`, `LanguageHistogramEntry`, `TopLevelEntry`
from `ghost-core/map/types.ts` to a non-map home — `ghost-core/scan-types.ts`
(or fold into an existing scan/inventory types module). Update the
`#ghost-core` barrel export and `scan/inventory.ts`'s import. This is a pure
move, no behavior change, and can land first as its own safe sub-commit.

## Step 2 — delete the routing layer and rewire consumers

Delete `ghost-core/map/` (schema, scopes, the map half of types, index) and the
`map.md` filename/handling. Then rewire each consumer. Grouped by how Phase 3
left them:

### Already dormant — just remove the map plumbing

- **`scan/fingerprint-stack.ts`** — `mapFromFingerprint` already returns empty
  scopes (Phase 3). Remove the function, the `map` field it feeds on the stack
  type, and the `MapFrontmatter` import. The `map:` property on
  `LoadedCheckPackage` / stack provenance goes too.
- **`ghost-core/checks/lint.ts`** — the `options.map` scope check (`Check
  references unknown map scope`) is the last live map consumer in lint. Remove
  it and the `getEffectiveMapScopes` import. (The scope/surface_type grounding
  was already made dormant in Phase 3.)
- **`ghost-core/checks/types.ts`** — drop the `map?: Pick<MapFrontmatter, ...>`
  field from the validate-lint options and routed-check types.

### Live routing to retire (moves to Phase 7 binding)

- **`ghost-core/checks/routing.ts`** — `routeGhostValidateForPath` /
  `routeGhostPathToScopes` are the path→scope→check router. **Path-based check
  routing is rebuilt against surfaces/binding in Phase 7.** For Phase 4: keep
  the pure path-matching helpers (`matchesGhostPath`, `normalizeGhostPath`,
  `globToRegExp`) if any non-map caller needs them, but remove the map-scope
  routing. Confirm via grep whether `routeGhostValidateForPath` has any live
  caller after `core/check.ts` is rewired (below); if not, delete it.
- **`core/check.ts`** — the `check` / `review` entry. It builds a per-stack
  `map` via `mapFromFingerprint` and routes through it. With map gone and the
  router retired, **`check` routes by `check.applies_to.paths` directly**
  (path-glob against changed files), with no scope layer. This is the dormant
  path road becoming a simple path-only router until Phase 7 adds surface
  binding. Keep `applies_to.paths` matching; drop scope matching.
- **`core/scope-resolver.ts`** — `resolveFingerprintsForPaths` resolves a
  changed path to `fingerprints/<scope>.md` via map scopes. **Check
  reachability first**: it is exported from `core/index.ts` but grep shows no
  live in-repo caller. If genuinely unused, **delete the whole file** (and its
  test). If a CLI path reaches it, reduce it to the parent-fallback behavior
  (always resolve to the root `fingerprint`) until Phase 7.

### Lint dispatch and status

- **`scan/file-kind.ts`** — remove the `map` `DetectedFileKind`, the
  `ghost.map/v1` and `map.md` detection branches, and the `lintMap` dispatch.
- **`scan/lint-map.ts`** — delete the file (the `map.md` linter).
- **`fingerprint.ts`** — remove the `lintMap` re-export.
- **`scan/scan-status.ts`** — remove `readMapFrontmatter` / `MAP_FILENAME` map
  reading and the map contribution it reports. Confirm scan-status still reports
  the remaining facets correctly with no map.
- **`scan/fingerprint-package.ts`** — remove `MAP_FILENAME` from the package
  file set (map.md is no longer a package file).

### Barrel

- **`ghost-core/index.ts`** — remove all `map/index.js` re-exports (the routing
  half), keep the relocated inventory-output type exports from their new home.

## Step 3 — tests

- **Delete** `test/ghost-core/map-scopes.test.ts` (77 lines — pure map scope
  behavior).
- **`test/scope-resolver.test.ts`** (127 lines) — delete if `scope-resolver` is
  deleted; otherwise retarget to the parent-fallback behavior.
- **`test/ghost-core/checks.test.ts`** — remove the remaining `map`/MAP routing
  cases (the `routeGhostValidateForPath` and `options.map` tests). The
  fingerprint-grounding cases were already migrated in Phase 3.
- **`test/cli.test.ts`** — the dormant "path matched / Matched scopes" relay and
  check-routing assertions skipped in Phase 3 stay skipped; remove any that
  asserted map files specifically. Re-verify `check` still passes/fails
  correctly on `applies_to.paths` alone.
- Full `pnpm test` (hook-enforced) is the gate.

## Scope boundary (what Phase 4 does NOT do)

- **Does not build surface-based routing.** Phase 4 leaves `check` routing on
  plain `applies_to.paths`. Surface/binding routing is **Phase 7**. Phase 4 is
  deletion, not replacement — replacement already happened for placement
  (Phase 3) and happens for routing (Phase 7).
- **Does not touch the resolver/menu** (Phase 5) or `relay` deletion (Phase 8).
- The `surveys`/`patterns` legacy schemas keep their own `surface_types` fields
  (separate concern, Phase 8 if ever).

## Changeset

Fold into the existing major changeset (`surface-coordinate-space.md`) rather
than adding a new one — Phase 4 is part of the same breaking release. Optionally
extend its body to mention `map.md` removal.

## Acceptance

- `ghost-core/map/` is gone; no `ghost.map/v1`, `MapFrontmatter`, `MAP_FILENAME`,
  `map.md`, or `lintMap` reference remains in `src` (grep clean).
- Inventory-output types survive at their new home; `ghost signals` / inventory
  scanning is unaffected.
- `check` / `review` run on `applies_to.paths` with no scope layer and no map.
- `pnpm build`, `pnpm typecheck`, full `pnpm test`, `pnpm check` all green.

## Process notes

- **Relocate before delete.** Step 1 (move inventory-output types) lands first
  and green; only then start deleting the routing layer, so the compiler tracks
  one concern at a time.
- The compiler is the worklist again, like Phase 3 — but smaller and almost
  entirely deletions.
- Confirm `scope-resolver` and `routeGhostValidateForPath` reachability with
  grep before deleting vs. reducing; do not guess.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Phase 4 succeeds if the map coordinate/routing layer is fully deleted, the
inventory-output types it incidentally housed are preserved at a non-map home,
`check`/`review` route on paths alone pending Phase 7, and the suite is green —
with surface-based routing explicitly deferred, not half-built.
