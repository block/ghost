# @anarchitecture/ghost

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
