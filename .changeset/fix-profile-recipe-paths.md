---
"ghost-expression": patch
---

Fix the profile recipe — it now reads `design_system.paths` (the actual map.md frontmatter field) instead of the nonexistent `design_system.location`. The skill bundle ships under ghost-expression, so the broken recipe shipped to host agents.
