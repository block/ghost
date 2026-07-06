---
"@design-intelligence/ghost": major
---

Rename the `gather` slice vocabulary to plain language. The JSON `slice.spokes`
field is now `slice.pointers`, and the pointer `kind` `"edge-hub"` is now
`"related"` with its origin in a `from` field (was `hub`). Docs and the skill
bundle drop the spine/corridor/hub-and-spoke metaphors; `edge` provenance is
unchanged.
