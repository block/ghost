---
name: verify
description: Confirm generated UI stays within the resolved Ghost memory stack; iterate if not.
handoffs:
  - label: Remediate deterministic or advisory findings
    skill: remediate
    prompt: Given the verify findings, suggest minimal code changes that close the drift
---

# Recipe: Verify Generated UI

**Goal:** run the generate -> check -> review -> repair loop against `.ghost/`.

## Steps

1. Generate the UI from a brief grounded in the resolved memory stack:
   merged `fingerprint.yml`, merged checks, open proposals, nearest examples,
   and human context.
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
6. If the review exposes missing or contradictory memory, apply the Proposal
   Threshold before taking memory action. Recommend a proposal candidate only
   when the gap is repeated, high-impact, explicitly human-stated,
   intentionally divergent, likely to recur, or blocks confident future review.
   Create it with `ghost proposal create --path <path>` only when the user
   explicitly asks to capture memory.

Only active `checks.yml` failures block. Advisory findings guide judgment and
may become proposals when they reveal durable memory gaps.
