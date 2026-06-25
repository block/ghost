---
status: exploring
---

# Phase 3 plan: placement on nodes — the breaking line

This note is the execution spec for Phase 3 of `implementation-plan.md`. **This
is the breaking line.** Phases 1–2 were additive; Phase 3 removes the legacy
coordinate fields from the canonical model and replaces them with a single
`surface:` placement pointer. After this lands, any `.ghost/` carrying
`topology` / `applies_to` / `surface_type` / `scope` fails to parse. This is the
first phase of the major release.

## What changes, in one sentence

Description nodes stop carrying coordinates as tags and start declaring a single
home surface by placement; `inventory.topology` is removed entirely.

## The fields removed (measured against the live schema)

From `ghost-core/fingerprint/schema.ts`:

| Node | Field removed | Replaced by |
| --- | --- | --- |
| `inventory.topology` | the whole subtree (`scopes`, `surface_types`) | nothing here — surfaces live in `surfaces.yml` (Phase 1) |
| `inventory.exemplars[]` | `surface_type`, `scope` | `surface: <id>` |
| `intent.situations[]` | `surface_type` | `surface: <id>` |
| `intent.principles[]` | `applies_to` | `surface: <id>` |
| `intent.experience_contracts[]` | `applies_to` | `surface: <id>` |
| `composition.patterns[]` | `applies_to` | `surface: <id>` |

`GhostFingerprintScopeSchema` and `GhostFingerprintTopologySchema` /
`GhostFingerprintTopologyScopeSchema` are deleted. The placement value is a
single `SlugIdSchema` optional field named `surface`.

## The check coordinate question (scope boundary)

`validate.yml` checks also carry coordinates: `GhostCheckSchema.applies_to`
(`scopes` / `paths` / `surface_types` / `pattern_ids`) and
`GhostCheckDerivationSchema` (`scopes` / `surface_types`). These are entangled
with **map-based routing** (`checks/routing.ts` consumes `check.applies_to`
against map scopes), which is Phase 4 / Phase 7 territory.

**Decision: do not touch `check.applies_to` in Phase 3.** Phase 3 is the
*description* facets (intent / inventory / composition). Check placement and the
retirement of map routing move together in Phase 4 (map delete) and Phase 7
(binding / diff routing), because they are one coupled concern. Keeping them out
of Phase 3 keeps this cut about the description model only, and avoids a
half-migrated routing layer. This is noted explicitly so Phase 3 does not grow.

## Placement field

A single optional key on each placeable node:

```yaml
surface: email-marketing
```

- Type: `SlugIdSchema.optional()` (the same slug used elsewhere; dotless not
  required here because it references a surface id, which is already dotless).
- Semantics: the node's home surface. Absent is allowed by the schema but
  **lint warns and teaches** (never silently global) — the explicit-placement
  decision from `surface-schema.md`.
- One value, not an array. Placement is single (a node lives in one place);
  cross-surface relevance is handled by ancestor cascade and typed edges, not by
  multi-placement.

## Lint changes (`fingerprint/lint.ts`)

- Remove `checkTopologyRefs` and all the scope/surface_type ref checking it does
  (`checkScopeRefs`, `checkScopeIdRef`, `checkSurfaceTypeRef`, `collectTopology`).
- Add `checkPlacement`: every `surface:` value must resolve against the surfaces
  declared in the package's `surfaces.yml`; an un-placed node warns
  (`fingerprint-node-unplaced`); a `surface:` with no matching id errors
  (`fingerprint-surface-unknown`), with a near-miss warning reusing the
  Levenshtein helper added in Phase 2.
- **Cross-facet dependency:** placement validation needs the surface list, which
  lives in a sibling file. Mirror how `validate.yml` lint already receives the
  assembled fingerprint via options — pass the parsed `surfaces.yml` (or the set
  of surface ids) into fingerprint lint as an optional input. When surfaces are
  not provided (single-file lint with no package context), placement ref checks
  degrade to "warn if obviously malformed" and the existence check is skipped,
  matching how validate lint behaves without a fingerprint.

## Consumers to update (the ripple)

Measured callers of the removed fields:

- `context/graph.ts` — the largest ripple. Builds a context graph from
  `applies_to`, `surface_type`, `scope`, and `topology.scopes`. Rework to read
  `surface:` placement and the surfaces tree instead. **This file is shared with
  the Phase 5 resolver work**; in Phase 3, do the minimum to keep it compiling
  and correct against placement (map the old "applicability" concept to "home
  surface"), and leave the richer cascade/edge composition for Phase 5.
- `scan/fingerprint-contribution.ts` — counts `topology.scopes` /
  `surface_types` toward contribution scoring. Replace with a surfaces.yml
  presence/count signal, or drop the topology term from the score.
- `scan/fingerprint-stack.ts` — references coordinate fields during merge; touch
  only what the field removal forces (full merge retirement is Phase 7).
- `context/package-context.ts`, `context/package-review-command.ts` — adjust any
  rendering that prints surface_type/scope to print `surface:` instead.

Do **not** expand scope into resolver/menu logic (Phase 5) or map deletion
(Phase 4); make the minimum edits to keep the build green against the new shape.

## Types (`fingerprint/types.ts`)

- Remove `GhostFingerprintScope`, `GhostFingerprintTopology`,
  `GhostFingerprintTopologyScope` interfaces and their exports from
  `fingerprint/index.ts` and `ghost-core/index.ts`.
- Remove `applies_to` / `surface_type` / `scope` from the node interfaces; add
  `surface?: string`.
- Remove `topology` from `GhostFingerprintInventory`.

## Tests

- Update `fingerprint-yml-schema.test.ts`: the minimal-doc expectation drops
  `topology: {}` from the inventory default; assert removed fields now fail
  `.strict()` parsing; assert `surface:` is accepted on each node type.
- Update/replace `fingerprint` lint tests that exercised topology refs with
  placement tests (unknown surface errors, unplaced warns, near-miss warns).
- Any fixture across the suite that uses the old fields must migrate to
  `surface:` or be expected to fail — grep the test tree for the removed field
  names and fix each.
- Full `pnpm test` is the gate (now enforced by the pre-commit hook).

## Changeset

Phase 3 is the first user-visible breaking change, so write the major changeset
stub now and grow it through Phases 4–8:

```markdown
---
"@anarchitecture/ghost": major
---

Replace topology/applies_to/surface_type/scope coordinates with a surfaces.yml
coordinate space and a single `surface:` placement per node.
```

## Acceptance

- `pnpm build`, `pnpm typecheck`, full `pnpm test`, `pnpm check` all green.
- The canonical schema rejects `topology`, `applies_to`, `surface_type`, `scope`
  and accepts `surface:` on situations, principles, experience_contracts,
  patterns, and exemplars.
- `fingerprint/lint.ts` validates placement against surfaces and warns on
  unplaced nodes, with near-miss suggestions.
- No reference to the removed types remains in `src` (grep clean).
- `check.applies_to` is deliberately untouched (Phase 4/7).

## Out of scope (explicitly)

- `check.applies_to` / check routing → Phase 4 (map delete) + Phase 7 (binding).
- Deleting `ghost.map/v1` → Phase 4.
- Slice resolver / menu / cascade composition → Phase 5.
- The migration command for existing packages → Phase 6 (Phase 3 just makes the
  old shape invalid; the migrator is built later, and this repo no longer has a
  dogfood `.ghost/` to migrate).

## Process notes

- This is the first phase that breaks things; expect the ripple to surface in
  the full test suite, not just typecheck. Lean on `pnpm test`.
- Make the schema/type/lint change first, then fix consumers until green, then
  fix tests — compiler and test failures are the worklist.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Phase 3 succeeds if the canonical fingerprint model expresses coordinates only
as a single `surface:` placement validated against `surfaces.yml`, every legacy
coordinate field is gone from schema/types/lint/consumers, checks are left for
Phase 4/7 on purpose, and the whole suite is green with the major changeset
started.
