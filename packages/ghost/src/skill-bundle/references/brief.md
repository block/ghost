---
name: brief
description: Build a concise pre-generation brief from Ghost memory.
---

# Recipe: Brief Work From Ghost Memory

1. Read checked-in `fingerprint.yml` product prose.
2. Select the relevant situations, principles, contracts, and patterns.
3. Inspect matching exemplars as concrete generation anchors.
4. Use optional generated inventory when present to understand what exists.
5. Skim active checks so generation avoids deterministic failures.
6. Use `ghost stack <path>`, accepted decisions, and `intent.md` only when the
   repo has opted into those advanced inputs.

Return a short brief with:

- Relevant memory IDs.
- Product obligations for this task.
- Exemplars to inspect.
- Inventory facts when cache is present.
- Active checks to avoid.
- Local evidence or examples.
- Provisional assumptions when fingerprint memory is silent.

When memory is silent, do not stop by default. Continue from nearby product
surfaces, local components, token and copy conventions, accepted decisions or
human intent, and ordinary UX judgment when safe. Label that reasoning as
provisional and non-Ghost-backed.

Memory updates are ordinary Git-reviewed edits to `fingerprint.yml`,
`checks.yml`, and optional rationale files when present.
