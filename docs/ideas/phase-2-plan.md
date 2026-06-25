---
status: exploring
---

# Phase 2 plan: surfaces lint + graph validation

This note is the execution spec for Phase 2 of `implementation-plan.md`. It adds
the graph-level validation that Phase 1 deliberately deferred, plus the CLI
wiring so `ghost lint` recognizes `surfaces.yml`. Phase 2 is **still additive**:
it validates a new file kind and changes no existing facet behavior. The
breaking line is Phase 3.

## What Phase 1 left for here

Phase 1's schema validates each node in isolation. It cannot see the whole tree.
Phase 2 adds the document-level checks Zod cannot express:

- `parent` references an existing surface id;
- the containment graph is a tree (no cycles, no node parenting itself);
- every edge `to` references an existing surface id;
- `core` is reserved as the implicit root (cannot be redeclared with a parent,
  cannot be the child of anything);
- duplicate surface ids are an error;
- near-miss ids (a `parent` or edge `to` that is one edit away from a real id)
  warn, per `purposes.md` leak #4.

Composition edges may form a graph, including cross-links and cycles among
edges — **only `parent` is tree-constrained.** Edge cycles are legal; parent
cycles are not.

## Deliverable

1. `ghost-core/surfaces/lint.ts` — `lintGhostSurfaces(input: unknown):
   GhostSurfacesLintReport`, mirroring `fingerprint/lint.ts`.
2. Export `lintGhostSurfaces` from `surfaces/index.ts` and `ghost-core/index.ts`.
3. CLI wiring in `scan/file-kind.ts`: detect `surfaces.yml` / `surfaces.yaml`
   and the `ghost.surfaces/v1` schema literal, and dispatch to the new linter.
4. Tests in `test/ghost-core/surfaces-lint.test.ts` (unit) and an addition to
   the file-kind/CLI lint test for dispatch.

No placement, no disk loader beyond what `ghost lint <file>` already does, no
removal of legacy fields. Those are Phase 3+.

## `lint.ts` shape

Follow `fingerprint/lint.ts` exactly: parse with the schema first, return early
on schema failure, then run document-level checks that accumulate issues.

```ts
import { GhostSurfacesSchema } from "./schema.js";
import {
  GHOST_SURFACE_ROOT_ID,
  type GhostSurfacesDocument,
  type GhostSurfacesLintIssue,
  type GhostSurfacesLintReport,
} from "./types.js";

export function lintGhostSurfaces(input: unknown): GhostSurfacesLintReport {
  const result = GhostSurfacesSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostSurfacesDocument;
  const issues: GhostSurfacesLintIssue[] = [];

  checkDuplicateIds(doc, issues);          // error: duplicate-id
  checkReservedCore(doc, issues);          // error: surface-core-reserved
  checkParentRefs(doc, issues);            // error: surface-parent-unknown
  checkParentCycles(doc, issues);          // error: surface-parent-cycle
  checkEdgeRefs(doc, issues);              // error: surface-edge-unknown
  checkNearMissIds(doc, issues);           // warning: surface-id-near-miss

  return finalize(issues);
}
```

### Rule details

- **duplicate-id** (error): two surfaces share an `id`. Reuse the
  `checkDuplicateIds` pattern from `fingerprint/lint.ts`.
- **surface-core-reserved** (error): a surface with `id: core` declares a
  `parent`, or some surface declares `parent: core`'s... no — `core` is a valid
  parent. The rule is narrower: `core` may not itself have a `parent` (it is the
  root). Declaring `id: core` is allowed (to describe it); giving it a parent is
  the error.
- **surface-parent-unknown** (error): a `parent` value with no matching surface
  `id`. `parent: core` is always valid even if `core` is not explicitly declared
  (it is the implicit root).
- **surface-parent-cycle** (error): following `parent` links from any surface
  must reach the root without revisiting a node. Detect via walk-with-visited-set
  per surface, or a single topological pass. Self-parent (`parent === id`) is a
  cycle.
- **surface-edge-unknown** (error): an edge `to` with no matching surface `id`.
  This is the dangling-ref check Phase 1's schema test documented as deferred.
  `to` does **not** get the implicit-`core` exemption — an edge must point at a
  declared surface.
- **surface-id-near-miss** (warning): a `parent` or edge `to` that does not match
  any id but is within edit distance 1–2 of a real id. Reuse the existing
  near-miss helper if `closestCanonical` (in `ghost-core`) generalizes; otherwise
  a small local Levenshtein. Warning, not error — teaches without blocking.

### Severity convention

Errors for structural breakage (dangling/cyclic/duplicate), warnings for
teach-don't-block (near-miss). This matches the existing facet linters and the
`reset.md` discipline that drafts can warn while curation catches up.

## CLI wiring (`scan/file-kind.ts`)

Add a `surfaces` kind to `DetectedFileKind`, detect it, and dispatch:

- In `detectFileKind`: `if (filename === "surfaces.yml" || filename ===
  "surfaces.yaml") return "surfaces";` (place alongside the other canonical
  filenames), and a schema-literal fallback
  `if (/^\s*schema:\s*ghost\.surfaces\/v1\b/m.test(raw)) return "surfaces";`
  before the `unsupported-yaml` catch.
- In `lintDetectedFileKind`: add a `kind === "surfaces"` branch calling a
  `lintSurfacesFile(raw)` wrapper that `parseYaml`s and calls
  `lintGhostSurfaces`, mirroring `lintPatternsFile` / `lintResourcesFile`
  (including the yaml-error guard).

This is the whole CLI surface for Phase 2: `ghost lint path/to/surfaces.yml`
works. Package-level lint that assembles surfaces into the broader report comes
when placement (Phase 3) makes surfaces part of the package model.

## Tests

`test/ghost-core/surfaces-lint.test.ts`:

- valid tree (core + children + cross-linked edges) → no issues;
- `parent` to a nonexistent id → `surface-parent-unknown` error;
- `parent: core` with no explicit `core` surface → valid (implicit root);
- `id: core` with a `parent` → `surface-core-reserved` error;
- a parent cycle (a→b→a) and a self-parent → `surface-parent-cycle` error;
- edge `to` a nonexistent id → `surface-edge-unknown` error (the Phase 1
  deferred case, now caught here);
- edge cycle (a composes b, b composes a) → **no** error (edges may cycle);
- duplicate ids → `duplicate-id` error;
- a `parent` one edit from a real id → `surface-id-near-miss` warning.

CLI/dispatch test (extend the existing file-kind or cli lint test): a
`surfaces.yml` routes to the surfaces linter and a malformed one reports
structured issues rather than throwing.

## Acceptance

- `pnpm build`, `pnpm typecheck`, `pnpm test` (full suite), and `pnpm check`
  all green.
- `ghost lint <surfaces.yml>` validates the file and reports tree/graph issues.
- No existing facet linter behavior changed; `file-kind.ts` only gains a branch.
- `lintGhostSurfaces` exported from `@anarchitecture/ghost/core`.

## Out of scope (explicitly)

- Node `surface:` placement on description facets → **Phase 3** (breaking).
- Removing `topology` / `applies_to` / `ghost.map/v1` → Phase 3–4.
- Assembling surfaces into the package-level verify/scan report → Phase 3+,
  once placement ties nodes to surfaces.
- The slice resolver / menu → Phase 5.

## Process notes (learned in Phase 1)

- The pre-commit hook now runs `just test` alongside `just check` (added to
  `lefthook.yml` after Phase 1 surfaced two regressions the check-only hook
  missed). The full suite is now an automatic gate; no per-phase choice to run
  it.
- The lefthook `format` step re-stages touched files. Keep unrelated changes out
  of a commit by staging deliberately and verifying `git diff --cached` before
  committing.

## Commit

One commit: `feat(surfaces): add ghost.surfaces/v1 lint and CLI dispatch`.
No changeset yet (still no user-visible breaking behavior; `ghost lint` gaining a
recognized file kind is additive — a `minor`-worthy note may be bundled into the
eventual major).

## Read-back

Phase 2 succeeds if a contributor can run `ghost lint surfaces.yml` and get
clear, structured errors for a broken tree (dangling/cyclic/duplicate) and
teaching warnings for near-miss ids, with edge cycles correctly allowed and only
`parent` tree-constrained — all without touching existing facet behavior.
