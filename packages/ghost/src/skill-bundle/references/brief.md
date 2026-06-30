---
name: brief
description: Build a pre-generation brief from a surface's gather slice — an instruction-plus-materials packet shaped as intent, inventory, and composition.
---

# Recipe: Brief Work From Ghost Fingerprint

A brief turns a `gather` slice into a packet the generating agent can act on:
the materials (the grounded node prose) plus the instruction (how to read it),
organized through the three authoring lenses. The lenses are an output *view*
here, not fields or structure — synthesize across the whole slice; never chop
one node into three pieces.

0. Before building, run the [self-check](self-check.md): if you cannot name the
   nodes you gathered, label each claim as Ghost-backed or provisional, and
   point to where the fingerprint is silent, you are not grounded yet — gather
   first.
1. Match the ask to a surface in the menu (`ghost gather --format json` with no
   surface lists the surfaces and their descriptions), then run
   `ghost gather <surface> --format json`.
2. Treat the gather slice as the agent contract: `surface`, `ancestors`, and the
   prose `nodes`, each with `provenance` (own, inherited from an ancestor, or
   contributed by a typed `relates` edge). The intent, the material, and the
   composition live in that node prose — surface them, do not add to them.
3. Add `--as <incarnation>` (e.g. email, voice) to filter the slice to one
   output form; essence (untagged) nodes always pass.
4. Run `ghost checks --surface <ids>` (the surfaces you determined the change
   touches) to ground them and see the offered checks, so generation avoids
   known failures.
5. When the slice is sparse, label local reasoning provisional rather than
   inventing surface-specific rules. An empty section is a valid result: write
   "the fingerprint is silent here" instead of manufacturing one.

Plain `ghost gather <surface>` is a compact human preview. Prefer `--format
json` as the agent interface.

The host agent owns natural-language matching: read the surface menu (each
surface's authored description) and pick the surface the ask belongs to. Ghost
never infers a surface from a repo path; the agent names it.

When no surface is selected (or an unknown one is named), `gather` returns the
surface menu, never the whole tree; choose a surface from it rather than
guessing.

## The packet

Return one short packet. Every claim is tagged: cite the node id for
Ghost-backed lines; mark the rest provisional. The packet is ephemeral working
context, never written back into `.ghost/`.

- **Grounded in:** the node ids you pulled (`surface`, its `ancestors`, and any
  `relates` edges), the incarnation if you filtered with `--as`, and the checks
  `ghost checks` offered.
- **Intent** — the why and the stance the work must carry.
- **Inventory** — the concrete materials to build with, and pointers to the code
  or inventory nodes the agent can inspect. Do not name components the
  fingerprint never did.
- **Composition** — the patterns to hold so the surface feels intentional
  (hierarchy, density, restraint, repetition, trust, flow). Fold in the offered
  checks as constraints, but advisory taste is not a gate unless a check backs
  it.
- **Silent / provisional:** where the slice does not cover the task and what
  carries the reasoning there.

The lenses are this packet's output view — never reshape the slice into
intent/inventory/composition on disk or in `gather`. Fingerprint edits are
ordinary Git-reviewed edits to the split fingerprint package.
