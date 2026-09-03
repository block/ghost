---
"@design-intelligence/ghost": minor
---

Add a `standard.component-set` node to the init skeleton. A repo with a shared
component set already answers most composition questions in code; the node
carries how to read that set — props as the contract, usage frequency as the
paved-road signal, and the nearest small view as the assembly reference —
without enumerating any component. Repos bind their own paths and lookups in a
`context.component-set` node next to it.
