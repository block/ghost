---
"@anarchitecture/ghost": minor
---

Collapse to one check format. Remove `ghost.validate/v1`, the `validate.yml`
facet, the `ghost check` deterministic gate, and the `./govern` export. Ghost
now has a single check format — markdown `ghost.check/v1`, routed by surface
(`ghost checks`) and grounded by the fingerprint. `parseUnifiedDiff` moved to a
neutral module; the `drift` stance ledger is unchanged.
