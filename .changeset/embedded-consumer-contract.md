---
"@design-intelligence/ghost": minor
---

Embedded-consumer contract: hoist gather/pull semantics from the CLI into the
library, so governed hosts embedding Ghost consume semantics instead of
mirroring command code.

- `buildGatherMenu(catalog, { includeWild })` in ghost-core returns
  `{ entries, wildAvailable, wildIncluded }` — the gather menu semantics
  (wild-posture gate + discoverability count) as a pure function; the CLI now
  consumes it.
- `orderPulledNodes` / `steeringBucket` (steering order: index → concrete →
  steady/wild → guard, stable within bucket) exported from ghost-core; the
  pull command now consumes them.
- Observability event types (`GatherObservabilityEvent`,
  `PullObservabilityEvent`, `PullMiss`, `GhostObservabilityEvent`,
  `NewGhostObservabilityEvent`) and the pure `stampGhostEvent` helper exported
  from `./fingerprint`, so embedders can record tape-shaped events in their own
  receipts without writing into a fingerprint package directory.
- `LoadedCheck` exported from `./fingerprint`.
- `#ghost-core` / `#scan` import types conditions point at shipped `dist/`
  declarations instead of unshipped `src/`.
- New `docs/embedded-consumers.md`: the contract page naming which behaviors
  are semantics every consumer must honor vs. CLI presentation.
