---
name: verify
description: Verify generated UI or fingerprint edits against Ghost.
---

# Recipe: Verify Ghost Work

1. Run `ghost validate .ghost` after
   fingerprint edits.
2. Run `ghost review --base <ref>` after implementation changes.
3. For advisory review, run `ghost checks --surface <ids>` (the surfaces the
   change touches) to ground those surfaces; every check is offered and you
   judge which apply.
4. For generation setup, match the ask to a surface via the menu
   (`ghost gather`) and run `ghost gather <surface> --format json`.
5. Consume the gather slice: the composed prose `nodes`, each with `provenance`
   (own / ancestor / edge).
6. Inspect generated UI manually or with screenshots when visual fidelity
   matters.

Report:

- Check failures and repairs.
- Advisory surface-composition drift with citations.
- Missing or unreachable evidence and exemplar paths.
- Provisional local reasoning where fingerprint nodes are silent.
- Any fingerprint edits the user requested.

Fingerprint edits should be validated before handoff. Implementation-only work
does not need Ghost package edits unless the user asks for them.
