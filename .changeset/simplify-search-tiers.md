---
"@anarchitecture/ghost": minor
---

Simplify `gather` inexact-query ranking to ordered match tiers: drop the numeric `score` and `coverage` fields from candidates and require every word of a multi-word phrase to land on a node (no partial-coverage matches).
