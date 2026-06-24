---
name: brief
description: Build a concise pre-generation brief from Ghost fingerprint facets.
---

# Recipe: Brief Work From Ghost Fingerprint

1. Run `ghost relay gather <target>` when a target path is known.
2. Start from the Relay stack, selected intent, and active obligations.
3. Express that intent through selected composition.
4. Inspect matching `inventory.exemplars` as concrete generation anchors.
5. Run `ghost signals <path>` when raw repo observations would help you find evidence.
6. Skim active checks so generation avoids deterministic failures.
7. Treat Relay gaps as prompts to inspect full facet files or label local reasoning provisional.

When JSON is needed, `ghost relay gather <target> --format json` includes a
`ghost.context-packet/v1` with lane items, provenance, omissions, gaps, and
selection trace. Custom dialect facets only count as Ghost context when they
declare a lane, capabilities, and deterministic projection.

Return a short brief with relevant fingerprint refs, product obligations,
inventory exemplars and building blocks to inspect, active checks to avoid,
local evidence, and provisional assumptions when facets are silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package.
