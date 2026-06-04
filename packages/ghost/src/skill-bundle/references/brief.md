---
name: brief
description: Build a concise pre-generation brief from Ghost fingerprint layers.
---

# Recipe: Brief Work From Ghost Fingerprint

1. Read checked-in `fingerprint.yml` prose, inventory, and composition.
2. Select the relevant `prose.situations`, `prose.principles`,
   `prose.experience_contracts`, and `composition.patterns`.
3. Inspect matching `inventory.exemplars` as concrete generation anchors.
4. Use optional generated cache when present to understand what exists.
5. Skim active checks so generation avoids deterministic failures.
6. Use `ghost stack <path>`, accepted decisions, and `intent.md` only when the
   repo has opted into those advanced inputs.

Return a short brief with:

- Relevant fingerprint refs.
- Product obligations for this task.
- Inventory exemplars and building blocks to inspect.
- Generated cache facts when present.
- Active checks to avoid.
- Local evidence or examples.
- Provisional assumptions when fingerprint layers are silent.

When fingerprint layers are silent, do not stop by default. Continue from nearby product
surfaces, local components, token and copy conventions, accepted decisions or
human intent, and ordinary UX judgment when safe. Label that reasoning as
provisional and non-Ghost-backed.

Fingerprint edits are ordinary Git-reviewed edits to `fingerprint.yml`,
`checks.yml`, and optional rationale files when present.
