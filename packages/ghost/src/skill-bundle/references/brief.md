---
name: brief
description: Build a concise pre-generation brief from Ghost fingerprint layers.
---

# Recipe: Brief Work From Ghost Fingerprint

1. Read checked-in `fingerprint/intent.yml`, `fingerprint/inventory.yml`, and `fingerprint/composition.yml`.
2. Select the relevant `intent.situations`, `intent.principles`, `intent.experience_contracts`, and `composition.patterns`.
3. Inspect matching `inventory.exemplars` as concrete generation anchors.
4. Run `ghost signals <path>` when raw repo observations would help you find evidence.
5. Skim active checks so generation avoids deterministic failures.
6. Use `ghost stack <path>` when the repo has nested fingerprint packages.

Return a short brief with relevant fingerprint refs, product obligations,
inventory exemplars and building blocks to inspect, active checks to avoid,
local evidence, and provisional assumptions when layers
are silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package.
