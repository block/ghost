---
name: brief
description: Shape a pre-generation brief from the resolved Ghost memory stack.
---

# Brief From The Ghost Fingerprint

Use this before generating or implementing product UI. The goal is to turn
repo-local memory into a concise working brief: what the agent should preserve,
where it has freedom, and what needs human judgment.

## Steps

1. Resolve the memory stack for the task path with `ghost stack <path>` when a
   path is known.
2. Read merged `fingerprint.yml` memory broad-to-local.
3. Select the relevant `situation` for the task, or state that none fits.
4. Pull applicable `principles`, `experience_contracts`, and `patterns`.
5. Read `implementation_vocabulary` only as current replaceable material.
6. Read merged checks for active deterministic gates.
7. Skim open proposals from the stack for gaps or intentional divergences.
8. Name missing or contradictory memory explicitly.

## Output

Produce:

- Task framing and selected situation.
- Relevant principles and experience contracts.
- Product-native pattern guidance.
- Implementation vocabulary that may help satisfy the product memory.
- Active checks to run afterward.
- Open proposals or known gaps.
- Decisions the human should make before generation.

When accepted fingerprint memory is silent, do not stop by default. Continue
from nearby product surfaces, local components, token and copy conventions,
accepted decisions or human intent, and ordinary UX judgment when safe. Label
that guidance as provisional and non-Ghost-backed, and ask the human only for
high-risk, irreversible, privacy/security/legal, or product-identity-defining
choices.

Do not claim provisional guidance as fingerprint context. If memory is missing,
apply the Proposal Threshold before recommending memory action. A proposal
candidate should be repeated, high-impact, explicitly human-stated,
intentionally divergent, likely to recur, or blocking confident future review;
otherwise name the gap as local uncertainty. If it qualifies, say which proposal
type should be recorded after the work: `missing-memory`,
`intentional-divergence`, `experience-gap`, or `check-candidate`.
