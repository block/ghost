---
name: recall
description: Gather the applicable Ghost brand truths for a task.
---

# Recipe: Recall Ghost Fingerprint

1. Run `ghost gather <ask>` to emit the menu — every node's id, kind, and
   description — for the actual task at hand.
2. Read the ask against the menu and match it to one or more nodes by their
   descriptions.
3. Run `ghost pull <id> [<id>…]` to read the selected nodes' bodies, and apply
   the truths, honoring each node's kind (a `principle` is always-on; a
   `condition` fires only when its stated situation holds; an `exemplar` is
   illustrative, not normative). Prefer `pull` over reading the files directly:
   it also appends the selection to the local `.ghost/.events` tape, so the
   fingerprint's author can see what was exposed, reached for, missed, or ignored
   with `ghost pulse`.

Return:

- The truths you selected and their short claims (cite by node id).
- How each applies (or does not) to the task at hand, respecting stated
  conditions.
- Any gaps where the fingerprint is silent and local evidence must carry the
  reasoning.

Ghost does no selection — it emits the menu; you pick. If the fingerprint is
silent on the task, say so plainly and continue with provisional local reasoning
when safe. Fingerprint edits are ordinary Git-reviewed edits.
