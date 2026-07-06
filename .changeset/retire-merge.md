---
"@decentralized-design/ghost": minor
---

Retire the `child-wins-by-id` fingerprint merge (Leak E): nested `.ghost/`
packages now bind paths to the root contract's surfaces instead of merging their
own facets in. A path resolves to the single root contract, used as-is — a child
package can no longer silently override or disable an inherited rule or check.
The `stack` / `check` / `review` outputs expose `contract` instead of `merged`,
and drop the `provenance.merge` field.
