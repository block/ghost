---
"@design-intelligence/ghost": minor
---

Removes the glossary posture system. Glossary kinds no longer accept a posture key; `ghost gather` drops the `--wild` flag and lists every node; `ghost pull` orders packets as index, concrete nodes, then prose; `ghost review` reports matched material-backed nodes without a separate review-critical section and renames the `unguarded-material` coverage gap to `unchecked-material`; `ghost pulse` drops the wild usage section. Existing fingerprints keep working: an ignored `posture` key in `glossary.md` frontmatter is tolerated, and anti-goal nodes still gather, pull, and match in review through their materials like any node.
