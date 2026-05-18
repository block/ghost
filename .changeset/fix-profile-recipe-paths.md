---
"ghost-scan": patch
---

Fix the fingerprint recipe — it now reads `design_system.paths` (the actual map.md frontmatter field) instead of the nonexistent `design_system.location`. The skill bundle ships under ghost-scan, so the broken recipe shipped to host agents.
