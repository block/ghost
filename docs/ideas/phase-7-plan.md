---
status: exploring
---

# Phase 7 plan: `ghost.binding/v1` — the path road and diff road

Execution spec for Phase 7 of `implementation-plan.md`, designed by
`surface-binding.md`. This is the **largest and least proof-validated** remaining
cut: it adds the binding (the only thing that turns a filesystem path into a
surface), wires path→surface and diff→surfaces into `check` / `review` and the
path road of selection, and retires the `child-wins-by-id` merge (Leak E).

Lands last by design — it depends on Phases 1–6 and on a real working tree to
validate against. Ship the **smallest** version: directory-default binding,
in-repo `contract: .`, defer external references.

## The decisions already settled (from `surface-binding.md`)

- **Both forms.** Directory location is the default binding (a scoped `.ghost/`
  binds its declared surfaces to that subtree); explicit `.ghost.bind.yml` is
  the escape hatch when ownership does not match the tree.
- **Precedence is positional.** Nearest binding along a path wins; explicit
  overrides directory-implied at the same level; no merge, no weights.
- **`paths:` live on the binding, never the surface.** This is the real home of
  the deleted `topology.scopes[].paths`.
- **Open forks resolved:** in-repo `contract: .` first (defer external refs);
  unbound path → root `core` if a root contract exists, else the menu; a binding
  *references* surface ids, it does not define new ones.

## The structural tension to resolve first (read before coding)

A full read of `scan/fingerprint-stack.ts` shows the current model is
**merge-centric**, and this is the heart of the cut:

- `loadFingerprintStackForPath` walks root→leaf and returns a *stack of layers*.
- `buildFingerprintStack` calls `mergeFingerprints` (`child-wins-by-id` union of
  intent/inventory/composition) and `mergeChecks` to produce one merged
  fingerprint, then lints the merged result.
- `check`, `review`, `relay`, `scan stack`, `scan emit` all consume
  `stack.merged.*`.

Binding says: **stop merging facets; bind a surface to a subtree instead.** But
the consumers want "a fingerprint + checks for this path." So the rewire is not
"delete merge" — it is **replace `merge layers → one fingerprint` with
`resolve path → binding → surface → composed slice`**, where the slice is the
Phase 5 resolver output, not a union of layer facets.

This is the load-bearing reframe and the riskiest part. Get the new resolution
primitive right first; then move each consumer onto it.

## Step 1 — the binding schema + loader

- New `ghost-core/binding/` (schema, types, index): `ghost.binding/v1` for
  `.ghost.bind.yml` — `contract` (string; only `.` supported now), `bindings[]`
  = `{ surface, paths[] }`. Zod-validated; lint that surface ids and paths are
  well-formed (cross-reference against the contract's surfaces happens at
  resolution, not schema).
- File-kind detection + lint dispatch for `.ghost.bind.yml` (mirror the
  `surfaces.yml` wiring from Phases 2/5).

## Step 2 — the path→surface resolver

A new resolver (e.g. `scan/binding-resolve.ts` or `ghost-core`), deterministic,
no LLM:

```
resolvePathToSurface(repoRoot, path, { surfaces, bindings }): {
  surface: string | null;   // null → no binding and no root core
  binding_dir: string;      // where the winning binding sits
  reason: "explicit" | "directory" | "root-core" | "unbound";
}
```

- Walk root→leaf along the path; collect candidate bindings (directory-implied
  from each scoped `.ghost/`'s `surfaces.yml`, and explicit `.ghost.bind.yml`).
- Nearest wins; explicit beats directory-implied at the same level.
- Directory-implied binding: a scoped `.ghost/` binds **its declared surfaces**
  to its subtree. When it declares exactly one non-`core` surface, that is the
  binding; when several, an explicit `.ghost.bind.yml` is required to
  disambiguate (report, don't guess — the migration discipline carries over).
- Unbound path: `core` if a root contract exists, else `null` (caller emits the
  menu).

## Step 3 — wire the roads

- **Path road (selection / Layer 3):** `gather --path <file>` resolves the path
  to a surface, then composes via the Phase 5 resolver. `gather <surface>` stays
  the explicit form. (Adds an option; does not change the prompt road.)
- **Diff road (governance / Layer 4):** in `core/check.ts`, resolve each changed
  file to its surface, take the **union of surfaces**, and run those surfaces'
  checks against the diff. Today `check` already routes by `applies_to.paths`
  (Phase 4); Phase 7 adds the surface dimension: a check on a surface applies to
  a changed file when the file binds to that surface (or an ancestor).
- **`review`** consumes the same path→surface resolution for its packet.

## Step 4 — retire the merge (Leak E)

- Replace `buildFingerprintStack`'s `mergeFingerprints` / `mergeChecks` with
  binding resolution. A "stack for a path" becomes "the root contract + the
  binding that owns the path + the composed slice", not a union of layer facets.
- Delete `mergeFingerprints`, `mergeIntent`, `mergeInventory`,
  `mergeComposition`, `mergeChecks`, `mergeById`, and the `child-wins-by-id`
  provenance. Keep layer *discovery* (root→leaf walk) — it is now binding
  discovery, not merge input.
- Update the stack types: `merged` → a resolved-surface result; provenance
  describes the winning binding, not a merge.

## Consumers to rewire (measured)

All consume `stack.merged.*` today:

- `core/check.ts` — diff road (Step 3). The biggest behavioral change.
- `review-packet.ts` — path→surface for the review packet.
- `scan-stack-command.ts` — `ghost stack` now inspects bindings, not a merge.
- `scan-emit-command.ts` — emits from the resolved surface, not the merged doc.
- `relay.ts` — **do not rewire; relay is deleted in Phase 8.** Leave it until
  then or stub it; do not invest in moving relay onto bindings.

## Scope boundary (what Phase 7 does NOT do)

- **No external contract references.** Only `contract: .` (in-repo). npm /
  resource-id references and version pinning are a later note (may reuse
  `ack` / `track`).
- **No relay rewire** (deleted Phase 8).
- **No new placement semantics** — surfaces and `surface:` placement are
  unchanged; this is purely path→surface and the merge retirement.
- The prompt road is unchanged.

## Tests

- Binding schema/lint: valid/invalid `.ghost.bind.yml`; well-formed paths.
- Path resolution: nearest binding wins; explicit beats directory-implied;
  unbound → `core` with a root contract; unbound → menu without one; multi-surface
  directory requires explicit (reported).
- Diff road: changed files → union of surfaces → those surfaces' checks run;
  a file bound to a child surface still gets ancestor (`core`) checks via cascade.
- `gather --path` resolves and composes.
- Merge retirement: the deleted merge functions are gone; a nested package binds
  rather than merges (a root edit does not alter a leaf's resolved slice; a child
  cannot disable an inherited check by merge).
- Re-express / un-skip the Phase 3 path-selection tests that now have a real
  home (the path road), where still meaningful.
- Full `pnpm test` (hook-enforced) green.

## Changeset

`minor` for the additive `ghost.binding/v1` + `gather --path`; the merge
retirement is internal (the merged-stack output shape changes, but the breaking
coordinate removals are already covered by the Phase 3–4 major changeset). If
the public `check` / `review` JSON shape changes (provenance), note it — that may
warrant folding into the major.

## Process notes

- **Resolve the structural tension first** (merge → binding-resolution), as its
  own commit if possible: build the path→surface resolver and prove it before
  touching consumers.
- Then rewire consumers one at a time, full suite green between each.
- This is the least-validated layer — treat the first in-repo resolution as a
  hypothesis. A scoped `.ghost/` fixture under a subtree is the proof case.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Phase 7 succeeds if a filesystem path resolves to a surface through a binding
(directory-default or explicit), `check` / `review` route a diff to the union of
its surfaces' checks, `gather --path` composes a slice for a file, the
`child-wins-by-id` merge is gone (nesting binds, never merges), and the contract
still carries no paths — with external contract references explicitly deferred.
