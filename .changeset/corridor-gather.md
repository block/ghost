---
"@anarchitecture/ghost-fingerprint": minor
---

Recompose `gather` on a corridor + hub-and-spoke model and fix a sibling-surface
context leak. A surface's slice is now: a **spine** of full-body nodes from every
file on the corridor (the package root down to the surface's own folder — folders
are walls, so sibling folders never leak in), the **edges** reachable in one hop
from any spine node's `relates` (so a broad rule authored once high in the tree —
e.g. `relates: { to: arcade }` on `features/` — reaches every descendant), and a
set of **spokes**: pointer entries (id + description) for the surface's own
descendants and any edge hub's subtree, which the agent pulls on demand. The
`GraphSlice` JSON gains a `spokes` array; graph nodes carry their file `folder`.
Grounding for `checks`/`review` remains the full-body spine + edges.
