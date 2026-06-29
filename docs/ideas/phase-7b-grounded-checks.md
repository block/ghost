---
status: exploring
---

# Phase 7b: grounded checks — surface-routed, fingerprint-explained

This note settles the governance model (Layer 4) after the binding (Phase 7a)
landed the path road. It supersedes the "give Ghost's deterministic detector a
`surface:`" sketch in `phase-7-plan.md`, which a real look at how checks are
actually authored proved wrong.

## What changed the design

Checks in practice are **markdown rules an agent evaluates against a diff**
(frontmatter: `name`, `description`, `severity`, `tools`; body: prose
instructions), filtered for relevance and run by a review pipeline. They are not
deterministic regex detectors, and Ghost is not the thing that runs them.

Three decisions follow:

1. **Ghost does not run checks.** Drop the deterministic-detector ambition. The
   legacy `ghost.validate/v1` regex detector is not the future of governance.
2. **Mimic the established check format** — markdown + frontmatter,
   agent-evaluated — so Ghost checks are compatible with the review pipeline that
   already exists, not a competing third format.
3. **The differentiator is grounding.** When a check flags something, Ghost
   supplies the *why* and the *what to change* from the fingerprint slice. The
   check finds the problem; the fingerprint explains and prescribes.

## The model: check finds, fingerprint grounds

A check is a markdown rule placed (or mapped) onto a surface. Governance is the
composition of three things Ghost already has or is adding:

```
diff path ──(binding, 7a)──▶ surface ──(cascade)──▶ relevant checks
                                   │
                                   └──(gather slice)──▶ grounding:
                                        principles/contracts = WHY
                                        patterns/exemplars  = WHAT to change
```

- **Routing (deterministic, Ghost's job):** a changed file resolves to a surface
  via the Phase 7a binding; the relevant checks are those governing that surface
  *and its ancestors* (the same `own + cascade` rule `gather` uses). This is the
  deterministic relevance filter — better than an LLM guessing which checks
  matter, because surface placement says so.
- **Evaluation (the agent's job, not Ghost's):** the agent applies the markdown
  rule to the diff. Ghost does not execute it.
- **Grounding (Ghost's differentiator):** for a flag on a surface, Ghost hands
  over that surface's `gather` slice — the principles/contracts as the *why*, the
  patterns/exemplars as the *what good looks like*. A finding becomes "this
  violates the checkout surface's `tokenized-ui-color` principle; here is the
  principle and an exemplar of doing it right," not a bare rule citation.

This is the `gather` resolver doing double duty: context for *building* and
grounding for *review*, through one surface cascade.

## What Ghost owns vs. does not

- **Owns:** path→surface routing (7a), surface cascade, the check→surface
  association, and the grounding slice. Ghost is the deterministic relevance
  filter + the fingerprint grounding source.
- **Does not own:** the check evaluation engine, the review pipeline, or the
  agent that judges the rule. Ghost emits "these checks apply to this surface,
  here is their grounding"; something else runs them.

## Open design questions (for the 7b build, not settled here)

1. **Check format + placement.** A Ghost check is markdown + frontmatter; how
   does it carry its surface? Frontmatter `surface:` is the natural mirror of
   node placement. But for *externally authored* checks Ghost must not edit, the
   association may live in a Ghost-side mapping (in the binding, or a small
   index) rather than the check file. Decide: placement in-file for Ghost-format
   checks, mapping for foreign checks.
2. **The grounding emit.** What exactly does Ghost output for a flagged surface —
   the full `gather` slice, or a review-shaped projection (why + exemplar refs +
   repair hints)? Likely a `review`-format packet built on the slice.
3. **Replacing `ghost.validate/v1`.** The deterministic detector schema becomes
   legacy. Decide whether to keep it as a niche option or deprecate it outright
   in favor of markdown checks. The `check` / `review` commands and their JSON
   contracts are affected.
4. **The diff road + merge retirement.** Still owed from Phase 7: `check` /
   `review` route a diff to the union of its surfaces (now via 7a binding), and
   `child-wins-by-id` merge in `fingerprint-stack.ts` is retired (nesting binds,
   not merges — Leak E). This is independent of the check-format question and
   could land first.

## Scope note

7a (binding + path road) is the substrate and is shipped. 7b is a design step
that needs its own plan before code, because it touches the check format, the
`check`/`review` commands, and possibly deprecates `ghost.validate/v1` — too
much to improvise. The merge retirement (open question 4) is the one piece that
is purely internal and format-agnostic; it can be cut on its own whenever.

## Read-back

This note is right if governance becomes: Ghost deterministically routes a diff
to the surfaces it touches and their checks (any format), the agent evaluates the
rule, and Ghost grounds every flag in the surface's fingerprint slice (why +
what) — with Ghost owning routing and grounding, never the check engine.
