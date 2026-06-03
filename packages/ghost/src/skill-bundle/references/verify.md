---
name: verify
description: Verify generated UI or memory against Ghost.
---

# Recipe: Verify Ghost Work

1. Run `ghost lint .ghost` and `ghost verify .ghost --root <target>` after
   memory changes.
2. Run `ghost check --base <ref>` after implementation changes.
3. For advisory review, run `ghost review --base <ref> --include-memory`.
4. Inspect generated UI manually or with screenshots when visual fidelity
   matters.

Report:

- Active-check failures and repairs.
- Advisory product-experience drift with citations.
- Provisional local reasoning where fingerprint memory is silent.
- Any memory updates the user requested.

Memory edits should be validated before handoff. Implementation-only work does
not need memory edits unless the user asks for them.
