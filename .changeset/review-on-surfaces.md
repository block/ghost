---
"@decentralized-design/ghost": minor
---

Rebuild `ghost review` on the surface rails: it now resolves the diff's touched
surfaces (via bindings), selects the markdown checks governing them, and grounds
each in the fingerprint slice — instead of emitting `validate.yml` and a
path-selection context packet. The advisory-review JSON replaces
`fingerprint` / `context_markdown` / `checks` / `stacks` with `touched_surfaces`,
`routed_checks`, and `grounding`. `ghost check` remains the deterministic gate.
