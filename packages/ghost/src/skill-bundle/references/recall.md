---
name: recall
description: Recall the applicable Ghost fingerprint nodes for a task.
---

# Recipe: Recall Ghost Fingerprint

1. Run `ghost gather` (no argument) to list nodes by id + description.
2. Match the task to one or more nodes by their descriptions; name the node.
3. Run `ghost gather <node>` to compose its slice (own body + inherited
   ancestors + one-hop `relates`).

Return:

- The gathered nodes and their short claims (cite by node id).
- Related nodes worth inspecting as concrete anchors.
- Checks that may affect the work.
- Any gaps where local evidence must carry the reasoning.

If the fingerprint is silent on the task, say that plainly and continue with
provisional local reasoning when safe. Fingerprint edits are ordinary
Git-reviewed edits.
