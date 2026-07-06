---
"@decentralized-design/ghost": minor
---

Add `ghost.binding/v1` (`.ghost.bind.yml`) and the path road: a repo path
resolves to the surface that owns it (directory-default binding or explicit
declaration), and `ghost gather --path <file>` composes that surface's slice.
The contract still carries no paths — bindings own all path matching.
