---
name: brief
description: Build a concise fingerprint application brief from Ghost layers.
---

# Recipe: Brief Work From Ghost Fingerprint

Produce a compact application brief that tells an agent how the portable
fingerprint contract applies to a specific task before it generates, revises, or
reviews product work.

1. Read checked-in `fingerprint/prose.yml`, `fingerprint/inventory.yml`, and `fingerprint/composition.yml`.
2. Select the relevant `prose.situations`, `prose.principles`, `prose.experience_contracts`, and `composition.patterns`.
3. Inspect matching `inventory.exemplars` as concrete generation anchors.
4. Use optional `fingerprint/sources/cache/` when present to understand what exists.
5. Skim active checks so generation avoids deterministic failures.
6. Use `ghost stack <path>`, accepted decisions, and `fingerprint/memory/intent.md` only when the repo has opted into those advanced inputs.

Return a short fingerprint application brief with relevant refs, product obligations,
inventory exemplars and building blocks to inspect, cache facts when present,
active checks to avoid, local evidence, and provisional assumptions when layers
are silent.

Fingerprint edits are ordinary Git-reviewed edits to the split fingerprint
package and optional rationale files.
