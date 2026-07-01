---
"@anarchitecture/ghost-fingerprint": minor
---

Return the node menu plus closest-id "did you mean" suggestions when `ghost
gather` is given an inexact query, instead of a separate ranked-candidate
search — the agent re-picks by description from the same menu the no-argument
form prints. `gather`, `checks`, and `review` all emit the stable
`ERR_UNKNOWN_SURFACE` code with closest-id suggestions for a node or surface
that is not in the package.
