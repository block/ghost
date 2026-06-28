---
name: remediate
description: Suggest minimal code or fingerprint edits after Ghost drift findings.
---

# Recipe: Remediate Ghost Drift

1. Read the review packet or check output.
2. Separate active-check failures from advisory findings.
3. For active-check failures, patch the smallest implementation change that
   satisfies the detector and preserves product intent.
4. For advisory findings, cite the relevant fingerprint refs and suggest the
   smallest product-aligned change, using exemplars as concrete anchors when
   relevant.
5. If the finding is actually intentional divergence, say so and ask whether to
   update the checked-in fingerprint.

Use `ghost check` after implementation changes. Use `ghost validate` after fingerprint edits.

Do not broaden the patch into unrelated refactors. Do not edit the Ghost package silently
unless the user asks to update the split fingerprint package, checks, or optional
rationale files.
