---
name: brief
description: Build a concise pre-generation brief from a surface's gather slice.
---

# Recipe: Brief Work From Ghost Fingerprint

1. When a target path is known, run `ghost gather --path <file> --format json`
   to resolve the surface that owns it and compose its slice.
2. For prompt-shaped work, match the ask to a surface in the menu
   (`ghost gather --format json` with no surface lists the surfaces and their
   descriptions), then run `ghost gather <surface> --format json`.
3. Treat the gather slice as the agent contract: `surface`, `ancestors`, and the
   composed `principles`, `experience_contracts`, and `patterns`, each with
   `provenance` (own, inherited from an ancestor, or contributed by a typed
   edge).
4. Express the surface's intent through its composed patterns.
5. Inspect matching `inventory.exemplars` as concrete generation anchors.
6. Run `ghost signals <path>` when raw repo observations would help you find
   evidence.
7. Run `ghost checks --diff <patch>` to see which checks govern the touched
   surfaces and their grounding, so generation avoids known failures.
8. When the slice is sparse, label local reasoning provisional rather than
   inventing surface-specific rules.

Plain `ghost gather <surface>` is a compact human preview. Prefer `--format
json` as the agent interface.

The host agent owns natural-language matching: read the surface menu (each
surface's authored description) and pick the surface the ask belongs to. Ghost
resolves a path to a surface deterministically via bindings, but it never does
the natural-language matching itself.

When no surface is selected (or an unknown one is named), `gather` returns the
surface menu, never the whole tree — choose a surface from it rather than
guessing.

Return a short human-facing brief synthesized from the slice: relevant
principles and contracts (the why), patterns and inventory exemplars to inspect
(what good looks like), checks to avoid, and provisional assumptions when the
surface is silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package.
