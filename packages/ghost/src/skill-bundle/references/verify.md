---
name: verify
description: Verify generated UI or fingerprint edits against Ghost.
---

# Recipe: Verify Ghost Work

Use the verification path that matches the work:

1. For fingerprint edits, run `ghost lint .ghost` and
   `ghost verify .ghost --root <target>`.
2. For generated or changed implementation, run `ghost check --base <ref>`.
3. For governance review, run `ghost review --base <ref> --include-memory`.
4. For generation readiness, run `ghost emit context-bundle` and inspect the
   prose, inventory, composition, and active checks.
5. For visual or interactive changes, inspect generated UI manually or with
   screenshots when fidelity matters.

Report:

- Active-check failures and repairs.
- Advisory product-experience alignment findings with citations.
- Missing or unreachable evidence and exemplar paths.
- Provisional local reasoning where fingerprint layers are silent.
- Any fingerprint edits the user requested.

Fingerprint edits should be validated before handoff. Implementation-only work
does not need Ghost package edits unless the user asks for them.
