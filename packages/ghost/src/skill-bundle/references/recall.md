---
name: recall
description: Recall applicable Ghost fingerprint facets for a task or file path.
---

# Recipe: Recall Ghost Fingerprint

1. Read checked-in `intent.yml`, `inventory.yml`, and `composition.yml` entries.
2. Select relevant intent, inventory exemplars, composition patterns, and active
   checks.
3. Summarize only fingerprint refs that apply to the task.

Return:

- Applicable fingerprint refs and short claims.
- Inventory exemplars to inspect when generation or review needs a concrete anchor.
- Active checks that may affect the work.
- Any gaps where local evidence must carry the reasoning.

If the fingerprint is silent, say that plainly and continue with provisional
local reasoning when safe. Fingerprint edits are ordinary Git-reviewed edits.
