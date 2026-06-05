---
name: brief
description: Build a concise pre-generation brief from Ghost fingerprint layers.
---

# Recipe: Brief Work From Ghost Fingerprint

1. Read checked-in `fingerprint/prose.yml`, `fingerprint/inventory.yml`, and `fingerprint/composition.yml`.
2. Select the relevant `prose.situations`, `prose.principles`, `prose.experience_contracts`, and `composition.patterns`.
3. Inspect matching `inventory.exemplars` as concrete generation anchors.
4. Use optional `fingerprint/sources/cache/` when present to understand what exists.
5. Skim active checks so generation avoids deterministic failures.
6. Use `ghost stack <path>`, accepted decisions, and `fingerprint/memory/intent.md` only when the repo has opted into those advanced inputs.

Return a short brief with relevant fingerprint refs, product obligations,
inventory exemplars and building blocks to inspect, cache facts when present,
active checks to avoid, local evidence, and provisional assumptions when layers
are silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package and optional rationale files.
