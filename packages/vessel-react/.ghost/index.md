---
for: Any task changing the Vessel workspace.
---

Vessel is ghost's reference body: an agnostic, agent-safe shadcn-compatible
component registry that a product's own ghost package can inhabit. This package
governs the Vessel workspace: its token contract, authoring discipline,
registry shape, and the boundary between reference vocabulary and
product-specific brand guidance.

Read `principle.reference-not-brand` first; it is the seam every other node
respects. The `asset.tokens` node describes the token contract that component
work must preserve. The `pattern.*` nodes carry the assembly grammar the
components encode: composition, controls, and conversation UI. The
`context.*` nodes apply in specific situations: escape hatches, upstream
shadcn syncs, and theming: and stay silent otherwise.

Shared model-default guidance stays in Ghost's starter and Vessel Light rather
than being copied into this workspace package. Vessel deliberately shares two
of those patterns: pill-shaped controls and fluid clamp display headings. Their
presence is fidelity, not drift. Convergence is not the crime; surrendering the
choice is.

This package does not carry product stance, flows, copy, or trust obligations.
Consuming repos author those in their own `.ghost/` packages. When guidance
here conflicts with a consumer's package, the consumer's guidance wins in its
repo.
