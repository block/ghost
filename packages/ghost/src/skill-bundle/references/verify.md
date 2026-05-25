---
name: verify
description: Confirm generated UI stays within .ghost/fingerprint.yml; iterate if not.
handoffs:
  - label: Remediate deterministic or advisory findings
    skill: remediate
    prompt: Given the verify findings, suggest minimal code changes that close the drift
---

# Recipe: Verify Generated UI

**Goal:** run the generate -> check -> review -> repair loop against `.ghost/`.

## Steps

1. Generate the UI from a brief grounded in `.ghost/fingerprint.yml`,
   `.ghost/checks.yml`, open proposals, nearest examples, and human context.
2. Run the deterministic gate:

   ```bash
   ghost check --base <ref>
   ```

3. Repair any active check failures.
4. Run advisory review:

   ```bash
   ghost review --base <ref>
   ```

5. Repair high-confidence advisory issues when they cite a diff location,
   fingerprint memory, and a concrete repair.
6. If the review exposes missing or contradictory memory, record a proposal
   instead of rewriting `fingerprint.yml` during verification.

Only active `checks.yml` failures block. Advisory findings guide judgment and
may become proposals when they reveal durable memory gaps.
