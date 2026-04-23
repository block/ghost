# ghost-drift

## 0.2.0

### Minor Changes

- [#51](https://github.com/block/ghost/pull/51) [`70e3816`](https://github.com/block/ghost/commit/70e38164fbb6bf1287567939e5986a4eaeb71a4c) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `ghost-drift describe` — prints a section map of `fingerprint.md` (frontmatter range, body sections, per-dimension decision blocks) with line ranges and token estimates, so host agents can selectively load only the sections they need instead of the whole file. The review and generate skill recipes now open with `describe` and teach a "load whole `# Decisions` block if uncertain" recall safety rule.

- [#46](https://github.com/block/ghost/pull/46) [`a96e335`](https://github.com/block/ghost/commit/a96e3352545ebc4e33c2e575dc45abd624ade351) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename `fleet` mode to `composite` across the library and CLI. The N≥3 compare output now reads "Composite Fingerprint: N members" — the aggregate view is a fingerprint of fingerprints.

  **BREAKING** (safe to bump minor while on 0.x, but pinning consumers should adjust):

  - Library exports renamed: `compareFleet` → `compareComposite`; `formatFleetComparison` / `formatFleetComparisonJSON` → `formatCompositeComparison` / `formatCompositeComparisonJSON`.
  - Type exports renamed: `FleetComparison` / `FleetMember` / `FleetPair` / `FleetCluster` / `FleetClusterOptions` → `Composite*` equivalents.
  - `compare()` result discriminator: `result.mode === "fleet"` is now `"composite"`, and `result.fleet` is now `result.composite`.
  - CLI header: `Fleet Overview: N projects` → `Composite Fingerprint: N members`.

  JSON output shape (member count, pairwise, spread, clusters) is unchanged.

- [#48](https://github.com/block/ghost/pull/48) [`a822e7c`](https://github.com/block/ghost/commit/a822e7cecae39801c53de03f836ae5e2f29b1470) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Role palette fields accept `{palette.dominant.<role>}` and `{palette.semantic.<role>}` references, so renames in the palette cascade into every role that cites them. `ghost-drift lint` flags unresolved references as `broken-role-reference`.

## 0.1.1

### Patch Changes

- [#43](https://github.com/block/ghost/pull/43) [`a8d1726`](https://github.com/block/ghost/commit/a8d1726c2870cf74d347409e4e7fb6eb2958f454) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document the Node.js 18+ requirement in the package README so it's visible on the npm listing page without readers having to open the `engines` field in `package.json`.

## 0.1.0

### Minor Changes

- [`6f9f36a`](https://github.com/block/ghost/commit/6f9f36aac35663bd020e771195ca4a729e4ead8a) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Initial public release. Deterministic design drift detection for agent-authored UI:

  - **Six CLI verbs** — `compare` (pairwise + fleet over 49-dim fingerprints, with `--semantic` and `--temporal` enrichment), `lint`, `ack`, `adopt`, `diverge`, and `emit` (derives `review-command`, `context-bundle`, or the `ghost-drift` skill).
  - **`fingerprint.md` format** — human-readable Markdown with a YAML machine layer (49-dim embedding + palette/spacing/typography/surfaces/roles) and a three-layer prose body (Character, Signature, Decisions). Parse, lint, diff, compose, and compare programmatically via the library export.
  - **Library API** — `parseFingerprint`, `lintFingerprint`, `diffFingerprints`, `compareFingerprints`, `compareFleet`, `loadFingerprint`, `defineConfig`, and the full `@ghost-drift` core usable headlessly from any Node app.
  - **Agent skill bundle** — `ghost-drift emit skill` installs an [agentskills.io](https://agentskills.io)-compatible bundle (`profile`, `review`, `verify`, `generate`, `discover`, `compare` recipes + schema reference) into your host agent of choice. The CLI never calls an LLM; the host agent owns all interpretive work.
