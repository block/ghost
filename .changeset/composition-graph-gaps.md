---
"@design-intelligence/ghost": major
---

Remove check surface routing: every check is now offered to the reviewer and the agent judges relevance, so the check `surface:` field, `selectChecksForSurfaces`, `RoutedCheck`, and `CheckRelevance` are gone. Checks bind to the fingerprint through an optional `source:` pointer (`node > Heading`) that `review` surfaces so a finding can cite the prose it enforces.
