---
name: verify
description: Verify generated UI or fingerprint edits against Ghost.
---

# Recipe: Verify Ghost Work

1. Run `ghost lint .ghost` and `ghost verify .ghost --root <target>` after
   fingerprint edits.
2. Run `ghost check --base <ref>` after implementation changes.
3. For advisory review, run `ghost review --base <ref> --include-memory`.
4. For generation setup, read the checked-in fingerprint package first:
   prose, inventory, composition, optional intent, and active checks when the
   task widens.
5. Inspect generated UI manually or with screenshots when visual fidelity
   matters.

Report:

- Active-check failures and repairs.
- Advisory surface-composition drift with citations.
- Missing or unreachable evidence and exemplar paths.
- Provisional local reasoning where fingerprint layers are silent.
- Any fingerprint edits the user requested.

Fingerprint edits should be validated before handoff. Implementation-only work
does not need Ghost package edits unless the user asks for them.
