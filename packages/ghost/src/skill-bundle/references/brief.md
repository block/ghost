---
name: brief
description: Shape a pre-generation brief from .ghost/fingerprint.yml.
---

# Brief From The Ghost Fingerprint

Use this before generating or implementing product UI. The goal is to turn
repo-local memory into a concise working brief: what the agent should preserve,
where it has freedom, and what needs human judgment.

## Steps

1. Read `.ghost/fingerprint.yml`.
2. Select the relevant `situation` for the task, or state that none fits.
3. Pull applicable `principles`, `experience_contracts`, `patterns`, and
   `substrate` entries.
4. Read `.ghost/checks.yml` for active deterministic gates.
5. Skim `.ghost/proposals/*.yml` for open gaps or intentional divergences.
6. Name missing or contradictory memory explicitly.

## Output

Produce:

- Task framing and selected situation.
- Relevant principles and experience contracts.
- Product-native pattern guidance.
- Substrate constraints: tokens, components, accessibility, responsive policy.
- Active checks to run afterward.
- Open proposals or known gaps.
- Decisions the human should make before generation.

Do not invent fingerprint context. If memory is missing, say which proposal
type should be recorded after the work: `missing-memory`,
`intentional-divergence`, `experience-gap`, or `check-candidate`.
