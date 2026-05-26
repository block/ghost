---
name: remediate
description: Given drift findings and the offending diff, suggest the minimal targeted fixes that close the gap.
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

**Goal:** turn drift findings into a small, targeted patch that brings the
working tree back inside `.ghost/fingerprint.yml` and active checks.

Ghost has no `ghost remediate` CLI command. You, the host agent, read the
findings, weigh them against `fingerprint.yml`, active checks, accepted
rationale, and open proposals, then write the smallest useful patch.

## Steps

### 1. Gather Inputs

You need:

- The drift output from `ghost review`, `ghost check`, or compare.
- The offending diff: `git diff <base> -- <file>`.
- `.ghost/fingerprint.yml`.
- `.ghost/checks.yml` for active gates.
- `.ghost/proposals/*.yml` for known gaps or accepted divergence candidates.
- `.ghost-sync.json` when present; anything stance:`diverging` is intentional
  and must not be remediated as accidental drift.

### 2. Match Findings To Memory

For every finding, identify the relevant fingerprint entry:

- Token drift -> related principle, pattern, or active check.
- Component drift -> related principle, pattern, or active check.
- Hierarchy/density drift -> principle, situation, or composition pattern.
- Disclosure/recovery drift -> experience contract.
- Copy/trust drift -> principle, experience contract, or review policy.

If no entry applies, do not invent one inside the code patch. Report a
`missing-memory` or `experience-gap` proposal.

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

Group patches by file. Keep each patch surgical. Do not refactor surrounding
code, rewrite unrelated imports, or clean up nearby style while remediating.

### 5. Surface What Cannot Be Remediated

Some findings have no clean code fix:

- The fingerprint is silent -> propose `missing-memory`.
- The product is intentionally changing -> propose `intentional-divergence`.
- The generated work failed to compose despite available memory -> propose
  `experience-gap`.
- A recurring deterministic issue can be detected -> propose `check-candidate`.
- The fix would cascade across many files -> stop and call out the separate
  implementation plan.

### 6. Record The Outcome

After the user applies or rejects patches:

- Re-run `ghost check` and `ghost review`.
- If the user accepts drift instead of fixing it, run `ghost ack` or
  `ghost diverge <dimension>`.
- Never regenerate or rewrite `fingerprint.yml` to hide drift.
