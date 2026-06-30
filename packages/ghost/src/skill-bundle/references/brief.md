---
name: brief
description: Build a concise pre-generation brief from a surface's gather slice.
---

# Recipe: Brief Work From Ghost Fingerprint

0. Before building, run the [self-check](self-check.md): if you cannot name the
   nodes you gathered, label each claim as Ghost-backed or provisional, and
   point to where the fingerprint is silent, you are not grounded yet. Gather
   first.
1. Match the ask to a surface in the menu (`ghost gather --format json` with no
   surface lists the surfaces and their descriptions), then run
   `ghost gather <surface> --format json`.
2. Treat the gather slice as the agent contract: `surface`, `ancestors`, and the
   prose `nodes`, each with `provenance` (own, inherited from an ancestor, or
   contributed by a typed `relates` edge). The intent, the material, and the
   composition live in each node's prose.
3. Add `--as <incarnation>` (e.g. email, voice) to filter the slice to one
   output form; essence (untagged) nodes always pass.
4. Run `ghost signals <path>` when raw repo observations would help you find
   evidence.
5. Run `ghost checks --surface <ids>` (the surfaces you determined the change
   touches) to ground them and see the offered checks, so generation avoids
   known failures.
6. When the slice is sparse, label local reasoning provisional rather than
   inventing surface-specific rules.

Plain `ghost gather <surface>` is a compact human preview. Prefer `--format
json` as the agent interface.

The host agent owns natural-language matching: read the surface menu (each
surface's authored description) and pick the surface the ask belongs to. Ghost
never infers a surface from a repo path; the agent names it.

When no surface is selected (or an unknown one is named), `gather` returns the
surface menu, never the whole tree; choose a surface from it rather than
guessing.

Return a short human-facing brief synthesized from the slice: the relevant
grounded nodes (their prose carries the why and what good looks like), checks to
avoid, and provisional assumptions when the surface is silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package.
