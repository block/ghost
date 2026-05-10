---
name: verify
description: Confirm generated UI stays within the local Ghost fingerprint bundle; iterate if not.
handoffs:
  - label: Remediate deterministic or advisory findings
    skill: remediate
    prompt: Given the verify findings, suggest minimal token/code changes that close the drift
---

# Recipe: Verify Generated UI

**Goal:** run the generate → check → review → repair loop against `.ghost/`.

## Steps

1. Generate the UI using `.ghost/patterns.yml`, `.ghost/survey.json`,
   optional `.ghost/intent.md`, nearest examples, and active checks as context.
2. Run the deterministic gate:

   ```bash
   ghost-drift check --base <ref>
   ```

3. Repair any active check failures.
4. Run advisory review:

   ```bash
   ghost-drift review --base <ref>
   ```

5. Repair high-confidence advisory issues when they cite a diff location,
   `patterns.yml` composition pattern, survey evidence, precedent/example, and repair.

Patterns and optional intent shape judgment. Only active `checks.yml` failures block.
