---
name: remediate
description: Given drift findings and the offending diff, suggest the minimum sufficient fixes that close the gap.
handoffs:
  - label: Re-review after applying the suggested fixes
    skill: review
    prompt: Re-run the review against the patched files to confirm the drift is closed
  - label: Acknowledge the drift as accepted
    command: ghost ack
    prompt: Acknowledge that the current fingerprint no longer matches and accept the drift
  - label: Declare a dimension intentionally divergent
    command: ghost diverge
    prompt: Record an intentional divergence on a specific dimension so it stops flagging
---

# Recipe: Remediate Drift

**Goal:** turn drift findings into the minimum sufficient patch that brings the
working tree back inside the resolved Ghost memory stack and active checks.

Ghost has no `ghost remediate` CLI command. You, the host agent, read the
findings, weigh them against merged `fingerprint.yml`, active checks, accepted
rationale, open proposals, and stack provenance, then write the smallest patch
that actually satisfies the cited product-experience obligation.

## Steps

### 1. Gather Inputs

You need:

- The drift output from `ghost review`, `ghost check`, or compare.
- The offending diff: `git diff <base> -- <file>`.
- The resolved stack from `ghost stack <path>` when the affected path is known.
- Merged `fingerprint.yml` memory.
- Merged checks for active gates.
- Open proposals from the stack for known gaps or accepted divergence candidates.
- `.ghost-sync.json` when present; anything stance:`diverging` is intentional
  and must not be remediated as accidental drift.

### 2. Match Findings To Memory

For every finding, identify the relevant fingerprint entry:

- Token drift -> related principle, pattern, or active check.
- Component drift -> related principle, pattern, or active check.
- Hierarchy/density drift -> principle, situation, or composition pattern.
- Disclosure/recovery drift -> experience contract.
- Copy/trust drift -> principle, experience contract, or review policy.

If no entry applies, do not invent one inside the code patch. Apply the
Proposal Threshold: recommend a `missing-memory` or `experience-gap` proposal
only when the gap is repeated, high-impact, explicitly human-stated, likely to
recur, or blocking confident future review. Create it with
`ghost proposal create --path <path>` only when the user explicitly asks to
capture memory.

Then classify the repair scope:

- **Local**: a token, class, copy, import, component substitution, or small state
  visibility change can satisfy the cited memory.
- **Structural**: layout, hierarchy, flow, action placement, component anatomy,
  state model, disclosure, recovery, or trust behavior must change.
- **Unresolved**: the fingerprint is silent or contradictory, or the product is
  intentionally changing. Silent memory does not block a safe local repair, but
  local-evidence reasoning must be labeled provisional and non-Ghost-backed.

Do not choose a local token or class patch when the cited memory is about
hierarchy, disclosure, recovery, trust, flow, or task structure. In those cases,
propose a structural patch or a short implementation plan.

### 3. Score By Impact

Rank findings by how much product experience they restore:

- **Blocking**: active check failures.
- **Load-bearing**: violations of principles, contracts, or required patterns.
- **Local cleanup**: small implementation mismatches with obvious fixes.
- **Uncertain**: advisory drift that needs human judgment.

If the finding is intentional for this change, suggest an
`intentional-divergence` proposal instead of a code patch.

### 4. Propose The Patch

For each finding, write a unified-diff suggestion in the form:

```text
file:line   before  ->  after   (why this satisfies fingerprint memory)
```

Group patches by file. Keep changes as narrow as the obligation allows, but let
the scope match the finding. A structural product-experience failure may require
changing component anatomy, layout, state visibility, or action placement. Avoid
unrelated cleanup, but do not under-fix the issue just to keep the diff small.

### 5. Surface What Cannot Be Remediated

Some findings have no clean code fix:

- The fingerprint is silent -> recommend `missing-memory` when it meets the
  Proposal Threshold.
- The product is intentionally changing -> recommend `intentional-divergence`.
- The generated work failed to compose despite available memory -> propose
  `experience-gap` when the gap is durable.
- A recurring deterministic issue can be detected -> propose `check-candidate`.
- The fix would cascade across many files -> stop and call out the separate
  implementation plan.

### 6. Record The Outcome

After the user applies or rejects patches:

- Re-run `ghost check` and `ghost review`.
- If the user accepts drift instead of fixing it, run `ghost ack` or
  `ghost diverge <dimension>`.
- Never regenerate or rewrite `fingerprint.yml` to hide drift.
