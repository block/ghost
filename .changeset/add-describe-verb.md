---
"ghost-drift": minor
---

Add `ghost-drift describe` — prints a section map of `fingerprint.md` (frontmatter range, body sections, per-dimension decision blocks) with line ranges and token estimates, so host agents can selectively load only the sections they need instead of the whole file. The review and generate skill recipes now open with `describe` and teach a "load whole `# Decisions` block if uncertain" recall safety rule.
