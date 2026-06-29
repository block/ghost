---
"@anarchitecture/ghost": minor
---

Rank the closest nodes when `ghost gather` is given an inexact query (matching
id, description, then body, single words or a phrase) instead of dumping the
whole menu, and emit the stable `ERR_UNKNOWN_SURFACE` code with closest-id
suggestions when `gather`, `checks`, or `review` is given a node or surface that
is not in the package.
