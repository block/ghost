---
status: exploring
---

# Phase 7b plan: grounded checks (execution)

Execution spec for the governance model settled in
`phase-7b-grounded-checks.md`. Ghost does not run checks; it **routes** a diff to
the surfaces it touches and **grounds** every flag in that surface's fingerprint
slice. The check format is markdown + frontmatter (agent-evaluated), mirroring
the established `.agents/checks` form — not Ghost's legacy regex detector.

This is sequenced as four cuts, ordered by independence and risk. Each lands
green on its own; do not bundle.

## Cut 1 — retire the `child-wins-by-id` merge (Leak E) [independent, do first]

The one piece with no dependency on the check-format question, and the last owed
item from `phase-7-plan.md`. Pure internal refactor.

- `scan/fingerprint-stack.ts` still has `mergeFingerprints`, `mergeIntent`,
  `mergeInventory`, `mergeComposition`, `mergeBuildingBlocks`, `mergeSummary`,
  `mergeChecks`, `mergeById`, `mergeByKey`, `mergeStrings`, and the
  `child-wins-by-id` provenance.
- Reframe a "stack for a path" from *merged facets* to *binding resolution*: the
  root contract + the binding that owns the path (Phase 7a) + the composed slice
  (Phase 5 resolver). Keep layer **discovery** (root→leaf walk); it is now
  binding discovery, not merge input.
- Consumers reading `stack.merged.{fingerprint,checks}` —
  `core/check.ts`, `review-packet.ts`, `scan-stack-command.ts`,
  `scan-emit-command.ts` — move onto the resolved-surface result. `relay.ts` is
  **not** rewired (deleted in Phase 8); stub or leave it.
- Tests: a root edit no longer alters a leaf's resolved slice; a child cannot
  disable an inherited check by merge; the deleted merge functions are gone.

This cut may be sizeable (4 consumers). It is the riskiest of the four and the
most independent, so it goes first and alone.

## Cut 2 — the Ghost check format

Define `ghost.check/v1` as **markdown + frontmatter**, deliberately
shape-compatible with the established agent-check format:

- Frontmatter: `name`, `description`, `severity` (`high`|`medium`|`low`),
  `tools`, optional `turn-limit`, plus the Ghost addition: **`surface:`**
  (placement, the natural mirror of node placement).
- Body: prose instructions for the agent (Purpose / Instructions), unchanged
  from the established convention.
- A parser + lint (`ghost-core/check/`): valid frontmatter, known severity,
  `surface:` is a flat slug. No detector, no execution — Ghost never runs it.
- File-kind detection for `.md` checks under a checks directory (mirror surfaces
  / binding wiring). Decide the on-disk location: a `checks/` dir in the package,
  or `.agents/checks/`-compatible — recommend a Ghost `checks/` dir in the
  package so it travels with the contract.

Open sub-decision (decide at build): for **foreign** checks Ghost must not edit
(no `surface:` in their frontmatter), the surface association lives in a
Ghost-side mapping (in the binding, or a small `checks` index), not the file.
Recommend: `surface:` in-file for Ghost-authored checks; a mapping for foreign
ones; same routing for both.

## Cut 3 — surface-routed relevance

The deterministic relevance filter — Ghost's first governance differentiator.

- Given a diff, resolve each changed path → surface (Phase 7a binding), take the
  union, and select the checks governing those surfaces **and their ancestors**
  (the `own + cascade` rule from the Phase 5 resolver, reused verbatim).
- Replace the legacy `routeGhostValidateForPath` (path-glob over
  `applies_to.paths`) with surface routing. `check` reports which checks apply to
  which surface for the diff. Ghost emits the relevant set; it does not run them.
- Tests: a checkout-file diff selects checkout + core checks, excludes email
  checks; an unbound path falls to core checks; cascade pulls ancestor checks.

## Cut 4 — fingerprint grounding

The second differentiator, built on `review`.

- For each flagged surface, emit the grounding: the surface's `gather` slice
  projected to *why* (principles/contracts) + *what to change*
  (patterns/exemplars, with exemplar paths). `review` already builds a
  fingerprint-grounded packet from a diff — extend it to key grounding by
  resolved surface rather than the merged doc.
- Decide the emit shape: a `review`-format packet section per surface — id,
  applicable checks, and the grounding slice — markdown + json.
- Tests: a flag on the checkout surface emits checkout's principles as why and a
  checkout exemplar as what; grounding cascades from ancestors.

## Deprecating `ghost.validate/v1`

The legacy regex detector becomes legacy. Recommendation: **keep it parseable
but stop treating it as the governance path** — `check`/`review` route by
surface and ground by fingerprint; the detector schema is no longer the future.
Full removal (and a check migration) is a later call, not 7b. Note any public
`check-report/v1` / advisory-review JSON shape change for the changeset.

## Scope boundary (what 7b does NOT do)

- No check **execution** — Ghost routes and grounds; the agent evaluates.
- No external contract references (still Phase 7a's deferred fork).
- No relay rewire (Phase 8 deletes it).
- Full removal of `ghost.validate/v1` and a check migration are deferred.

## Changeset

Per cut: Cut 1 internal (note any `check`/`review` JSON shape change — may fold
into the major). Cuts 2–4 `minor` (new `ghost.check/v1`, surface routing,
grounding emit are additive public surface).

## Process notes

- **Cut 1 first and alone** — it is independent and the riskiest; do not
  entangle it with the check format.
- Then 2 → 3 → 4 in order (format before routing before grounding).
- Reuse the Phase 5 resolver's cascade for routing (Cut 3) and grounding (Cut 4)
  — one mechanism serves build context and review.
- Each cut green through the hook before the next.

## Read-back

7b succeeds if the `child-wins-by-id` merge is gone (nesting binds, not merges),
a Ghost check is markdown + frontmatter with a surface, a diff deterministically
selects the checks governing its surfaces and ancestors, and every flag is
grounded in the surface's fingerprint slice — with Ghost owning routing and
grounding and never the check engine.
