---
"ghost-drift": minor
---

Rename `fleet` mode to `composite` across the library and CLI. The N≥3 compare output now reads "Composite Fingerprint: N members" — the aggregate view is a fingerprint of fingerprints.

**BREAKING** (safe to bump minor while on 0.x, but pinning consumers should adjust):

- Library exports renamed: `compareFleet` → `compareComposite`; `formatFleetComparison` / `formatFleetComparisonJSON` → `formatCompositeComparison` / `formatCompositeComparisonJSON`.
- Type exports renamed: `FleetComparison` / `FleetMember` / `FleetPair` / `FleetCluster` / `FleetClusterOptions` → `Composite*` equivalents.
- `compare()` result discriminator: `result.mode === "fleet"` is now `"composite"`, and `result.fleet` is now `result.composite`.
- CLI header: `Fleet Overview: N projects` → `Composite Fingerprint: N members`.

JSON output shape (member count, pairwise, spread, clusters) is unchanged.
