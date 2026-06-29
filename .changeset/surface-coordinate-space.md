---
"@anarchitecture/ghost": minor
---

Replace topology/applies_to/surface_type/scope coordinates with a surfaces.yml
coordinate space and a single `surface:` placement per node. Remove the
`ghost.map/v1` (`map.md`) coordinate and routing system; checks now route by
`applies_to.paths`.
