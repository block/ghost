---
status: exploring
---

# Phase 7b Cut 4 plan: fingerprint grounding

Execution spec for Cut 4 of `phase-7b-plan.md`, the final governance cut. Cut 3
made Ghost the deterministic relevance filter (a diff → its surfaces → the
checks that govern them). Cut 4 adds the second differentiator: when a surface
is in scope, Ghost emits the **grounding** — the *why* and the *what to change*
drawn from that surface's fingerprint slice. The check finds the problem; the
fingerprint explains and prescribes.

## What grounding is

For each touched surface, project its `gather` slice (already built by
`resolveSurfaceSlice`, reused as-is) into a review-shaped grounding:

- **why** — the surface's principles + experience_contracts (own + inherited),
  the design intent a finding can cite.
- **what to change** — the surface's patterns + exemplars (with exemplar
  `path`/`title`/`why`), the concrete "what good looks like."

Grounding inherits the same way context does: a checkout finding is grounded in
checkout's own principles *and* the brand-wide (`core`) ones, because the slice
already includes ancestors. No new traversal — Cut 3 extracted the shared
inheritance into `surfaces/cascade.ts`; the slice resolver already uses it.

## Where it attaches

Extend the Cut 3 `ghost checks` output. Today it emits, per diff:
`touched_surfaces` + the routed checks (name/severity/surface/relevance). Cut 4
adds a `grounding` section keyed by surface:

```
checks  → routed checks (Cut 3)
grounding → per touched surface:
  surface id
  why:  [{ ref, kind: principle|contract, statement }]
  what: [{ ref, kind: pattern|exemplar, statement, path? }]
```

markdown + json, same as Cut 3. A finding cites a check (from `checks`) and the
grounding for that check's surface (from `grounding`).

## Why `checks`, not `review`

The plan said "built on `review`." On inspection, `review` is the **legacy**
path: it builds a packet from the retired merged-stack/`validate.yml` world. The
new governance surface is the Cut 3 `ghost checks` command, which already
resolves surfaces from a diff. Grounding belongs there — extending the new
command, not reviving the legacy `review` packet.

**Decision:** attach grounding to `ghost checks` (the surface-native command).
Leave `review` as the legacy advisory packet; its eventual replacement/removal
rides with `validate/v1` deprecation, not this cut.

## The core function

A pure projection, no I/O, no LLM:

```
groundSurface(
  surfaces, fingerprint, surfaceId,
): SurfaceGrounding   // { surface, why[], what[] }
```

Built by calling `resolveSurfaceSlice(surfaces, fingerprint, surfaceId)` and
mapping its `principles`/`experience_contracts` → why, `patterns`/`exemplars` →
what. Provenance from the slice (own | ancestor) is preserved so the consumer
can show "brand-wide" vs. "checkout-specific" grounding.

## The emit

- `ghost checks --diff` gains a `grounding` array (one entry per touched
  surface) in both json and markdown.
- A `--no-grounding` flag (or `--checks-only`) keeps the Cut 3 lean output for
  callers that only want relevance. Default includes grounding.
- markdown: under each surface, a "Why" list (principles/contracts) and a "What
  good looks like" list (patterns + exemplar paths).

## Tests

- `groundSurface`: a checkout surface yields checkout principles as why and a
  checkout exemplar (with path) as what; ancestor (`core`) principles appear as
  inherited why.
- `ghost checks --diff`: the json includes `grounding` keyed by touched surface;
  markdown shows why + what per surface.
- `--no-grounding` omits it.
- Empty surface (no nodes) yields an empty-but-valid grounding.
- Full `pnpm test` (hook-enforced) green.

## Scope boundary (what Cut 4 does NOT do)

- **No check execution** — Ghost emits checks + grounding; the agent evaluates
  and decides what is actually a finding.
- **No `review` rewrite** — the legacy advisory packet stays until `validate/v1`
  deprecation.
- **No new fingerprint fields** — grounding is a projection of the existing
  slice.
- **No external contract references** (still deferred from 7a).

## Changeset

`minor` — grounding on `ghost checks` is additive.

## Process notes

- Pure `groundSurface` first (unit-tested with in-memory docs), reusing
  `resolveSurfaceSlice`; then wire it into the command's output.
- Reuse the slice's provenance for own-vs-inherited labeling; do not recompute.
- Stage deliberately; the format hook re-stages touched files.

## Read-back

Cut 4 succeeds if `ghost checks --diff` emits, per touched surface, the why
(principles/contracts) and what-to-change (patterns/exemplars with paths) drawn
from that surface's slice — inherited from ancestors like context is — so a
flagged check can be grounded in the fingerprint, with Ghost still never running
the check and `review`/`validate/v1` left for a later cut.
