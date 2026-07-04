---
name: brief
description: Build a pre-generation brief from gathered brand truths as a steering packet with provenance.
---

# Recipe: Brief Work From Ghost Fingerprint

A brief turns the truths you gathered into a packet the generating agent can act
on: the selected node prose plus instructions for how to read it. The packet is
ephemeral working context, never written back into `.ghost/`.

0. Before building, run the [self-check](self-check.md): if you cannot name the
   nodes you gathered, label each claim as Ghost-backed or provisional, confirm
   which conditions actually apply, and point to where the fingerprint is silent,
   you are not grounded yet — gather first.
1. Run `ghost gather <ask> --format json` to get the menu, then match the ask to
   the nodes it belongs to by their descriptions. Use the actual task as the
   free-text ask so the local event tape records which menu was exposed for what.
2. Run `ghost pull <id> [<id>…]` to read the selected nodes' bodies (prefer
   `pull` over direct file reads — it logs the selection to the local
   `.ghost/.events` tape for the author). Always include `index` in your pull
   unless you have already read it this session — it carries the fingerprint's
   non-negotiables and reading posture. Honor each node's kind **as the
   glossary defines it** — the glossary is the authoritative meaning of every
   kind, and `ghost gather` emits each kind's purpose in the menu legend. The
   starter vocabulary is only a default; an author's glossary overrides it.
3. When the truths are sparse, label local reasoning provisional rather than
   inventing rules. An empty section is a valid result: write "the fingerprint is
   silent here" instead of manufacturing one.

The host agent owns natural-language matching: read the menu (each node's
`description`) and pick the truths the ask belongs to. Ghost never selects for
you.

## The packet

Return one short packet. Every claim is tagged: cite the node id for
Ghost-backed lines; mark the rest provisional. Use these sections when relevant:

- **Grounded in:** the node ids you pulled.
- **Conditions that apply:** which conditional truths apply or do not apply, and
  why, respecting the glossary and the node prose.
- **Non-negotiables:** the hard invariants from the pulled nodes (and `index`),
  stated as never/always lines with node ids. These bind regardless of taste;
  everything below them is direction to interpret.
- **Stance:** the governing principle, tradeoff, or intent the work must carry.
- **Materials:** concrete assets, tokens, components, implementation paths, or
  other locators the fingerprint names. Do not name materials the fingerprint
  never did.
- **Patterns:** bound/open structure the output should follow.
- **Exemplars:** what good form, rhythm, quality, code shape, or voice to match;
  state what the exemplar is normative for and what is incidental.
- **Anti-goals:** plausible generic or neighboring outputs to avoid.
- **Decision traces:** settled tradeoffs that should not be re-litigated, plus
  any stated reversal condition.
- **Silent / provisional:** where the fingerprint does not cover the task and
  what carries the reasoning there.

The steering sections are a briefing view, not on-disk fields. Never reshape the
fingerprint into required `stance` / `materials` / `patterns` fields. Fingerprint
edits are ordinary Git-reviewed edits.
