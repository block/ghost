---
"@decentralized-design/ghost": minor
---

Remove the absorbed and dead commands: `relay`, `stack`, `survey`, `diff`, and
`describe`, along with the relay-only context modules and the `./relay` package
export. Their intent now lives in the surface model — `gather` for context,
`checks` for diff-routed governance, and bindings for path resolution. The skill
bundle teaches the surface workflow.
