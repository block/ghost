---
name: critique
description: Critique generated or changed UI using Ghost memory.
---

# Recipe: Critique Generated Work

1. Run `ghost review --base <ref>` or inspect the changed files directly.
2. Read checked-in `fingerprint.yml` and active checks.
3. Compare the work against the relevant situations, principles, contracts, and
   patterns.
4. Inspect relevant exemplars as concrete anchors for what good looks like.
5. Lead with actionable findings. Cite diff locations, fingerprint memory,
   exemplars, active checks, and repairs where relevant.

When fingerprint memory is silent, you may use nearby product surfaces, local
components, token and copy conventions, accepted decisions, or human intent when
present. Label that reasoning as provisional and non-Ghost-backed.

Do not make advisory taste judgment sound blocking unless an active check backs
it. If memory is missing or contradictory, name that as `missing-memory` or
`experience-gap`; update memory only when the user asks you to edit it.
