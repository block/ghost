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
   the truths, honoring each node's kind **as the glossary defines it** — the
   glossary is the authoritative meaning of every kind, and `ghost gather`
   emits each kind's purpose in the menu legend. The starter vocabulary reads: a
   `principle` is usually stance or floor, a `condition` fires only when its
   stated situation holds, an `exemplar` is illustrative unless the node says it
   is normative, an `anti-goal` names likely wrong outputs, an `asset` points at
   concrete materials, a `pattern` binds structure, and a `decision` preserves a
   tradeoff. An author's glossary overrides all of this. Always include `index`
   in your pull unless you have already read it this session — it carries the
   fingerprint's non-negotiables and reading posture. Prefer `pull` over reading
   the files directly: it also appends the selection to the local
   `.ghost/.events` tape, so the fingerprint's author can see what was exposed,
   reached for, missed, or ignored with `ghost pulse`.

## Steering read order

Ghost does no selection — it emits the menu; you pick. When preparing to
generate, this read order is a useful default, not routing logic:

1. Pull `index` first for non-negotiables and silence posture.
2. Pull applicable `principle.*` nodes for stance, tradeoffs, and hard floor.
3. Pull `asset.*` nodes when exact materials, tokens, components, or files
   matter.
4. Pull `pattern.*` nodes when the task has a known structure.
5. Pull `exemplar.*` nodes when form, rhythm, voice, quality, or code shape
   matters.
6. Pull `anti-goal.*` nodes when generic output risk is high.
7. Pull `decision.*` nodes when tradeoffs are ambiguous or likely to be
   re-litigated.
8. Label anything missing as silent/provisional instead of inventing coverage.

Return:

- The truths you selected and their short claims (cite by node id).
- How each applies (or does not) to the task at hand, respecting stated
  conditions.
- Any gaps where the fingerprint is silent and local evidence must carry the
  reasoning.

If the fingerprint is silent on the task, say so plainly and continue with
provisional local reasoning when safe. Fingerprint edits are ordinary
Git-reviewed edits.
