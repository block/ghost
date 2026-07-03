---
name: brief
description: Build a pre-generation brief from the gathered brand truths — an instruction-plus-materials packet shaped as intent, inventory, and composition.
---

# Recipe: Brief Work From Ghost Fingerprint

A brief turns the truths you gathered into a packet the generating agent can act
on: the materials (the selected node prose) plus the instruction (how to read
it), organized through the three authoring lenses. The lenses are an output
*view* here, not fields or structure — synthesize across the truths you pulled;
never chop one node into three pieces.

0. Before building, run the [self-check](self-check.md): if you cannot name the
   nodes you gathered, label each claim as Ghost-backed or provisional, confirm
   which conditions actually apply, and point to where the fingerprint is silent,
   you are not grounded yet — gather first.
1. Run `ghost gather <ask> --format json` to get the menu, then match the ask to
   the nodes it belongs to by their descriptions. Use the actual task as the
   free-text ask so the local event tape records which menu was exposed for what.
2. Run `ghost pull <id> [<id>…]` to read the selected nodes' bodies (prefer
   `pull` over direct file reads — it logs the selection to the local
   `.ghost/.events` tape for the author). Honor each node's kind: apply a `principle`
   as always-on; apply a `condition` only when its stated situation holds; treat
   an `exemplar` as illustrative, not normative. The intent, the material, and
   the composition live in that node prose — surface them, do not add to them.
3. When the truths are sparse, label local reasoning provisional rather than
   inventing rules. An empty section is a valid result: write "the fingerprint is
   silent here" instead of manufacturing one.

The host agent owns natural-language matching: read the menu (each node's
description) and pick the truths the ask belongs to. Ghost never selects for you.

## The packet

Return one short packet. Every claim is tagged: cite the node id for Ghost-backed
lines; mark the rest provisional. The packet is ephemeral working context, never
written back into `.ghost/`.

- **Grounded in:** the node ids you pulled, and the conditions you determined to
  apply.
- **Intent** — the why and the stance the work must carry.
- **Inventory** — the concrete materials to build with, and pointers to code the
  agent can inspect. Do not name materials the fingerprint never did.
- **Composition** — the patterns to hold so the output feels intentional
  (hierarchy, density, restraint, repetition, trust, flow).
- **Silent / provisional:** where the fingerprint does not cover the task and
  what carries the reasoning there.

The lenses are this packet's output view — never reshape the fingerprint into
intent/inventory/composition on disk. Fingerprint edits are ordinary Git-reviewed
edits.
