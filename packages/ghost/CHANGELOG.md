# @anarchitecture/ghost

## 0.2.1

### Patch Changes

- [#103](https://github.com/block/ghost/pull/103) [`1b9ad4a`](https://github.com/block/ghost/commit/1b9ad4a13f14e240b7f2dfd17b4546cbe632008d) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify Ghost review prompts stay grounded in fingerprint memory and active checks.

- [#104](https://github.com/block/ghost/pull/104) [`b900cf8`](https://github.com/block/ghost/commit/b900cf8d71aed7cc2a242e212b216d195512939e) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify that drift remediation should make the minimum sufficient repair instead of optimizing for the smallest diff.

## 0.2.0

### Minor Changes

- [#89](https://github.com/block/ghost/pull/89) [`4111610`](https://github.com/block/ghost/commit/4111610e22c705338ea0058565bd55ea896b44ba) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add typed fingerprint grounding for active ghost.checks/v1 checks.

- [#90](https://github.com/block/ghost/pull/90) [`06e56c5`](https://github.com/block/ghost/commit/06e56c5e3105eef5d0be5ab20db0349542494218) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make fingerprint.yml the canonical package artifact for init, lint, scan, verify, and check grounding.

- [#94](https://github.com/block/ghost/pull/94) [`9f72a24`](https://github.com/block/ghost/commit/9f72a245212e874a2e6975af14c1fd70f25e5f34) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Emit package context bundles from fingerprint.yml memory by default.

- [#95](https://github.com/block/ghost/pull/95) [`71b3d79`](https://github.com/block/ghost/commit/71b3d79322bb96d76c7e19753c6020079bcbc070) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Emit review commands from fingerprint.yml memory by default.

- [#91](https://github.com/block/ghost/pull/91) [`2da2987`](https://github.com/block/ghost/commit/2da2987171da8d3e5c39c276327f00d3bd0220d4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Read fingerprint.yml as the canonical advisory review packet context.

- [#88](https://github.com/block/ghost/pull/88) [`1a736de`](https://github.com/block/ghost/commit/1a736de86e34f68e596e05905c45b142b4222980) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add core schema, types, and linting helpers for ghost.fingerprint/v1.

- [#92](https://github.com/block/ghost/pull/92) [`f41a4bf`](https://github.com/block/ghost/commit/f41a4bf7aa23106606b4b65a876d9f82841fe3d0) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename proposal kinds around missing memory, intentional divergence, experience gaps, and check candidates.

- [#100](https://github.com/block/ghost/pull/100) [`b1e8aa4`](https://github.com/block/ghost/commit/b1e8aa46eac4f8aff7ca101ba694acdc034cbffd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds adapter-neutral memory directory overrides and stabilizes Ghost check JSON for host wrappers.

- [#98](https://github.com/block/ghost/pull/98) [`9ee5941`](https://github.com/block/ghost/commit/9ee5941044a9665d67cfae4e904607529af8aa20) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add data-only Ghost config scaffolding and reference-library context for Ghost UI consumers.

- [#97](https://github.com/block/ghost/pull/97) [`536c345`](https://github.com/block/ghost/commit/536c345144b8fafb543fea904de950fb8c5f6388) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Replace substrate-backed fingerprint memory with implementation vocabulary and durable check grounding.

- [#100](https://github.com/block/ghost/pull/100) [`b1e8aa4`](https://github.com/block/ghost/commit/b1e8aa46eac4f8aff7ca101ba694acdc034cbffd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds nested Ghost memory stacks, scoped proposals, and diff-aware check/review routing.

### Patch Changes

- [#96](https://github.com/block/ghost/pull/96) [`8af8c81`](https://github.com/block/ghost/commit/8af8c81bb9c2028490be8e60d5505a9275f3cba6) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify fingerprint.yml as canonical memory across docs and CLI help.

- [#93](https://github.com/block/ghost/pull/93) [`9afaa24`](https://github.com/block/ghost/commit/9afaa24b981365238f4527dcb5d6810f291fcfc6) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Update bundled Ghost skill recipes around fingerprint.yml-centered memory.

- [#99](https://github.com/block/ghost/pull/99) [`46a2eb9`](https://github.com/block/ghost/commit/46a2eb9cb6dfd71ee7e04f00759341d87a415677) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Validate fingerprint scopes, surface types, and check routing targets against canonical topology memory.

## 0.1.0

### Minor Changes

- [#78](https://github.com/block/ghost/pull/78) [`3dc8aeb`](https://github.com/block/ghost/commit/3dc8aeb21595a65bba8ced4c3373f9ca43925234) Thanks [@gnahCnayR](https://github.com/gnahCnayR)! - Add `--gate` mode to `ghost compare` that reads `.ghost-sync.json` and reports per-dimension verdicts (aligned / covered / reconverging / uncovered). Exits 0 when no uncovered drift, 1 when uncovered, 2 on hard error. Versioned JSON output via `--format json` (schema: `ghost.compare.gate/v1`). Composes over existing `compareFingerprints`, `readSyncManifest`, and `checkBounds` — no new orchestration.

- [#81](https://github.com/block/ghost/pull/81) [`e5163a6`](https://github.com/block/ghost/commit/e5163a6449cf44a93be0d69c6556d5560d16f73a) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Publish Ghost as one scoped package with the `ghost` CLI, unified scan and drift workflows, and one installed skill bundle.

- [#83](https://github.com/block/ghost/pull/83) [`0ba295a`](https://github.com/block/ghost/commit/0ba295a92516e0c65cdf685e5d9794297be8f2c4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Report scan evidence readiness so agents can distinguish product-observed, component-demo, substrate-only, and unobservable Ghost bundles.

### Patch Changes

- [#83](https://github.com/block/ghost/pull/83) [`0ba295a`](https://github.com/block/ghost/commit/0ba295a92516e0c65cdf685e5d9794297be8f2c4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe the installed skill and docs around agent-led Ghost Fingerprint Capture.

## 0.0.0

Source version for the unified Ghost package. The first public publish is
expected to be cut by Changesets as `0.1.0`.
