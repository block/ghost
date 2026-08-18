---
"@design-intelligence/ghost": minor
---

Rename the node retrieval frontmatter field from `context` back to `description`. `context` is now rejected at validation with a rename message; gather/pull output, the embed API, coverage reporting, and the lint rules (`node-description-missing`) all use `description`.
