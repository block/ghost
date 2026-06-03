---
name: remediate
description: Suggest minimal code or memory changes after Ghost drift findings.
---

# Recipe: Remediate Ghost Drift

1. Read the review packet or check output.
2. Separate active-check failures from advisory findings.
3. For active-check failures, patch the smallest implementation change that
   satisfies the detector and preserves product intent.
4. For advisory findings, cite the relevant fingerprint memory and suggest the
   smallest product-aligned change, using exemplars as concrete anchors when
   relevant.
5. If the finding is actually intentional divergence, say so and ask whether to
   update checked-in memory.

Use `ghost check` after implementation changes. Use `ghost lint` and
`ghost verify` after memory changes.

Do not broaden the patch into unrelated refactors. Do not edit memory silently
unless the user asks to update `fingerprint.yml`, `checks.yml`, or optional
rationale files.
