---
name: critique
description: Critique generated or changed UI using Ghost fingerprint facets.
---

# Recipe: Critique Generated Work

1. Run `ghost review --base <ref>` or inspect the changed files directly.
2. Read checked-in fingerprint facets and active checks.
3. Compare the work against the relevant intent and composition patterns.
4. Inspect relevant inventory exemplars as concrete anchors for what good looks like.
5. Lead with actionable findings. Cite diff locations, fingerprint refs,
   inventory exemplars, active checks, and repairs where relevant.

When fingerprint facets are silent, you may use nearby product surfaces, local
components, token and copy conventions. Label that reasoning as provisional and
non-Ghost-backed.

Do not make advisory taste critique sound blocking unless an active check backs
it. If fingerprint grounding or facet coverage is missing or contradictory,
name that as `missing-fingerprint` or `experience-gap`; edit the Ghost package
only when the user asks you to.
