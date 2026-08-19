---
"@design-intelligence/ghost": minor
---

Rename the node retrieval frontmatter field to `for`: the situation or activity the guidance is for. Both prior names are rejected at validation with rename messages (`context`, `description`); gather/pull output, the embed API, coverage reporting (`withoutFor`), and the lint rule (`node-for-missing`) all use `for`.
