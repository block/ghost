---
"ghost-fingerprint": major
"ghost-drift": patch
---

Drop `roles[]` from the `fingerprint.md` schema. Slot → token bindings either fall out of decisions[] (pattern consequences) or live in survey.json components[] (exhaustive catalog). The hybrid `roles[]` slot was filling neither role cleanly and didn't scale to systems with many components. Existing files that carry `roles:` will fail strict lint — drop the section to migrate. Drift skill recipes that referenced `roles[]` as part of the fingerprint frontmatter have been updated.
