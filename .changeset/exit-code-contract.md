---
"@decentralized-design/ghost": patch
---

Make CLI exit codes consistent so an agent can branch on them: unexpected
errors exit `1`, caller mistakes (bad flags, invalid environment, refused
overwrites) exit `2` via a typed `UsageError`, and a missing package now exits
`2` with a `ghost init` hint instead of leaking a raw filesystem error.
