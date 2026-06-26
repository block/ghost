---
status: exploring
---

# Phase 5 plan: slice resolver + menu, as the new `gather` command

Execution spec for Phase 5 of `implementation-plan.md`. This is the first
phase that **adds capability** rather than removing it: it rebuilds the dormant
selection road (Job 2 of `context/graph.ts`, inert since Phase 3) on the surface
model, and ships it as a new context-gathering command — relay's *desire* done
right (the "desire-survives" decision in `implementation-plan.md`).

Layer 3 (Selection), prompt road. The path/diff road is Phase 7.

## What this builds

1. **A surfaces loader** — read `surfaces.yml` from a package. **It does not
   exist yet**: Phases 1–2 built the schema + lint, but nothing loads the file
   from disk. This is the missing first piece.
2. **The slice resolver** — given a surface id, deterministically compose its
   slice: own placed nodes + cascaded ancestor nodes + typed-edge contributions.
   No LLM.
3. **The menu emitter** — surfaces + descriptions for the host agent to match a
   prompt against. Ambiguity returns the menu, never a whole-tree dump.
4. **The `gather` command** — the CLI surface that ties it together.

## Step 1 — surfaces loader

Add surfaces to the package model the same way the facets are loaded:

- Add `surfaces` to `FingerprintPackagePaths` (`surfaces.yml`) in
  `scan/fingerprint-package.ts`, and read it in `loadFingerprintPackage`
  (optional — absent means a single implicit `core` surface).
- Parse with `GhostSurfacesSchema`; surface a typed `GhostSurfacesDocument` (or
  `undefined`) on the loaded package and on `PackageContext`.
- Lint wiring already exists (Phase 2 `file-kind.ts`); this is the *read into the
  model* step that Phase 2 deferred.

## Step 2 — the resolver (the heart)

A pure function in a new `ghost-core` module (e.g. `surfaces/resolve.ts`) or a
`context/` module — **deterministic, no LLM, no I/O**:

```
resolveSurfaceSlice(
  surfaces: GhostSurfacesDocument | undefined,
  fingerprint: GhostFingerprintDocument,
  checks: GhostValidateDocument | undefined,
  surfaceId: string,
): ResolvedSlice
```

Composition rule, straight from `coordinate-space.md`:

- **Own nodes** — every fingerprint node whose `surface:` equals `surfaceId`.
- **Cascaded ancestors** — walk `parent` from `surfaceId` to `core`; include
  nodes placed on each ancestor. Ancestors contribute to descendants (the only
  inheritance, and it is down-the-tree only — no mixins, no priority weights,
  per `reset.md`).
- **Typed-edge contributions** — for each edge on the resolved surface(s),
  include the target surface's own nodes, tagged by edge kind (`composes`,
  `governed-by`) so the consumer knows *why* they are present. Edges do **not**
  recurse (one hop) to stay legible; revisit only if a real case needs it.
- **Unplaced nodes** — a node with no `surface:` belongs to `core` for
  resolution **only if** the design says so. Per `surface-schema.md`, unplaced
  warns; for resolution, treat unplaced as `core`-level (reaches everywhere) so
  sparse fingerprints still produce a slice, but lint still nudges placement.

Output is a structured slice (placed nodes by facet + provenance: own /
ancestor:<id> / edge:<kind>:<id>), not prose. The host agent renders.

## Step 3 — the menu

```
buildSurfaceMenu(surfaces): SurfaceMenuEntry[]   // id, description, parent, edges
```

Deterministic list of surfaces with their authored descriptions, for the host
agent to match a natural-language ask against. Ghost does **no NLP**. When the
caller does not name a surface (or names an unknown one), `gather` returns the
menu, never the whole tree — the brand-mixing cure (`coordinate-space.md`,
scenario 3).

## Step 4 — the `gather` command

A new command (working name `gather`) that:

- `ghost gather <surface>` → resolves and emits the slice (markdown or `--format
  json`).
- `ghost gather` (no surface) or unknown surface → emits the menu.
- Reads the package via the surfaces loader + existing package context.
- No `--config` / `--request` / `--mode` relay flags. This is the desire
  (right context at the right time), not relay's machinery.

This is **net-new and additive** — it does not modify `relay` (deleted in
Phase 8) and is not built on `relay-config` / `request-resolution` /
`relay-modes`.

## Step 5 — un-skip the dormant tests, retire Job 2 improvisation

- The Phase 3 skips (`context-entrypoint`, `context-sandbox`, the `gather`-shaped
  `cli` relay cases) tested path-based selection over the old coordinate model.
  Their *intent* — "the right nodes come back for a target" — is now served by
  surface resolution. **Re-express the still-valid ones against `gather`**;
  delete the rest. Do not revive `globalFallbackRefs` / `CAPS` truncation.
- `context/entrypoint.ts` Job 2 (`matchScopes`, `globalFallbackRefs`, `CAPS`)
  was made dormant in Phase 3. Phase 5 **replaces** it with surface resolution.
  What survives: the graph's *structure/content* half (nodes + typed ref edges,
  Job 1) if the menu/slice rendering reuses it; the scope/path matching half is
  superseded by surface placement and can be deleted once `gather` stands.

## Scope boundary (what Phase 5 does NOT do)

- **No path/diff road.** `gather` takes a surface id (or returns the menu).
  Turning a changed file or diff into a surface is **Phase 7** (binding). Do not
  build path→surface here.
- **No relay deletion.** `relay` and its `context/relay-*` plumbing stay until
  Phase 8; `gather` lives beside them.
- **No agent matching.** Ghost emits the menu; the host agent picks. No NLP,
  no embeddings in the core path.
- **No migration command** (Phase 6).

## Tests

- Resolver: own-node selection; ancestor cascade (multi-level); edge
  contribution with provenance; unplaced→core; a surface with no nodes returns
  an empty-but-valid slice.
- Menu: shape (id/description/parent/edges); ordering deterministic.
- Ambiguity: no surface / unknown surface → menu, not tree.
- `gather` CLI: surface → slice (markdown + json); no-surface → menu; absent
  `surfaces.yml` → single `core` slice.
- Re-expressed selection tests from the Phase 3 skip set.
- Full `pnpm test` (hook-enforced) green.

## Changeset

New `minor` changeset (additive command + exports) — `gather` is new public
surface and does not, by itself, remove anything. The major changeset from
Phase 3–4 still covers the breaking removals.

## Process notes

- **Loader first, then pure resolver, then command** — build inward-out so the
  resolver can be unit-tested with in-memory docs before any CLI wiring.
- Reuse the surfaces near-miss/levenshtein helper for "unknown surface → did you
  mean" in the menu path.
- The resolver is pure and deterministic; keep all I/O in the loader and command.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Phase 5 succeeds if `ghost gather <surface>` returns a deterministic slice
(own + cascaded ancestors + typed edges, with provenance), `ghost gather` with
no/unknown surface returns the described menu instead of the whole tree, the
surfaces loader reads `surfaces.yml` into the package model, and the dormant
selection road is replaced — with the path/diff road explicitly left for
Phase 7.
