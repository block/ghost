---
status: exploring
---

# Phase 7b Cut 3 plan: surface-routed check relevance

Execution spec for Cut 3 of `phase-7b-plan.md`. This is where the pieces compose:
the 7a binding (path→surface), the Phase 5 cascade (own + ancestors), and the
Cut 2 markdown checks (`ghost.check/v1`) combine into Ghost's first governance
differentiator — **deterministically answering "which checks are relevant to
this diff?"** without an LLM guessing and without Ghost running anything.

## The core function

A pure resolver, no I/O, no LLM:

```
selectChecksForSurfaces(
  checks: GhostCheckDocument[],          // markdown checks with surface placement
  surfaces: GhostSurfacesDocument | undefined,
  touchedSurfaces: string[],             // surfaces a diff touched (from binding)
): RoutedCheck[]                         // check + why (own | ancestor:<id>)
```

A check governs a touched surface when its `surface:` equals that surface **or
any ancestor** of it (the same `own + cascade` rule as `resolveSurfaceSlice` —
reuse `ancestorChain`, do not reinvent). An unplaced check (`surface` absent)
governs `core`, so it applies to every diff (brand-wide). Provenance tags each
routed check `own` or `ancestor:<id>` so the consumer knows why it fired.

This mirrors the slice resolver exactly: a diff's checks are composed the same
way a surface's context is — one cascade mechanism for build and review.

## The diff road

```
diff → changed paths → (7a binding) → touched surfaces (union) → selectChecks → relevant checks
```

- Parse the diff to changed paths (existing `parseUnifiedDiff`).
- Resolve each path to a surface via `discoverBindingsForPath` +
  `resolvePathToSurface` (7a). Collect the union of touched surfaces.
- `selectChecksForSurfaces` returns the checks governing those surfaces and
  ancestors. Ghost emits the set; the agent evaluates each markdown rule.

## The decision this cut forces: which checks does `check` route?

Today `core/check.ts` loads `validate.yml` (legacy `ghost.validate/v1` regex
detectors) and routes by `applies_to.paths`. Cut 3 introduces routing for the
**new markdown checks**. They must not be conflated:

- **`ghost.check/v1` markdown checks** — routed by **surface** (this cut). Ghost
  does not run them; it selects and emits them for the agent.
- **`ghost.validate/v1` detectors** — legacy. Keep their existing path-glob
  routing working untouched, but they are no longer the governance future.

**Recommendation:** add surface routing as a *new* path that loads markdown
checks from a `checks/` directory in the package, alongside (not replacing) the
legacy detector path. Do not rip out `routeGhostValidateForPath` yet — deprecate
by addition. A later cut removes `validate/v1` wholesale.

## Loading markdown checks

- Add a checks-directory concept to the package: `<package>/checks/*.md`.
- A loader (`scan/`) reads the dir, lints each with `lintGhostCheck`, and returns
  `GhostCheckDocument[]` (skipping/erroring on invalid ones per lint).
- Absent `checks/` dir → no markdown checks (the legacy `validate.yml` path is
  unaffected).

## Surfacing it

Two honest options for where routing shows up; pick the smallest:

1. **A new command** `ghost checks --diff <patch>` (or `ghost route-checks`) that
   prints the relevant markdown checks per touched surface (markdown + json).
   Clean, additive, does not disturb `check`.
2. **Extend `check`** to also report routed markdown checks beside the legacy
   detector findings.

**Recommendation:** option 1 — a new, small, additive command. It keeps the
legacy `check` deterministic-detector path untouched and gives the markdown-check
routing its own clean surface. Grounding (Cut 4) then extends this command, not
`check`.

## Replace vs. keep `routeGhostValidateForPath`

Keep it for the legacy detector path (Phase 4 left it path-only and it works).
Cut 3 adds surface routing for markdown checks; it does not touch the legacy
router. The plan's "replace `routeGhostValidateForPath`" line is softened to
"add surface routing beside it" — replacing it fully waits for `validate/v1`
removal, so this cut stays additive and green.

## Tests

- `selectChecksForSurfaces`: a checkout-touched diff selects checkout + core
  checks, excludes email checks; cascade pulls ancestor checks; an unplaced
  check applies to every diff; an empty touched set yields only core checks.
- Diff road: a diff touching `apps/checkout/**` (bound to checkout) routes to
  checkout + core markdown checks.
- Checks-dir loader: reads + lints `checks/*.md`; ignores non-check markdown.
- The new command: diff → relevant checks per surface (markdown + json).
- Full `pnpm test` (hook-enforced) green.

## Scope boundary (what Cut 3 does NOT do)

- **No grounding** — emitting why/what from the fingerprint is Cut 4.
- **No check execution** — Ghost selects and emits; the agent evaluates.
- **No `validate/v1` removal** — legacy detectors and their router stay.
- **No external contract references** (still deferred from 7a).

## Changeset

`minor` — the surface-routing resolver, the checks-dir loader, and the new
command are additive.

## Process notes

- Pure `selectChecksForSurfaces` first (unit-tested with in-memory docs), then
  the checks-dir loader, then the diff road, then the command.
- Reuse `ancestorChain` from the slice resolver — extract/share it rather than
  copy. One cascade definition for context and governance.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Cut 3 succeeds if a diff deterministically selects the markdown checks governing
the surfaces it touches and their ancestors — reusing the slice cascade, routing
by surface not path, emitting (never running) the relevant set — with the legacy
detector path left intact and grounding deferred to Cut 4.
