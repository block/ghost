---
"@anarchitecture/ghost": minor
---

Add `--gate` mode to `ghost compare` that reads `.ghost-sync.json` and reports per-dimension verdicts (aligned / covered / reconverging / uncovered). Exits 0 when no uncovered drift, 1 when uncovered, 2 on hard error. Versioned JSON output via `--format json` (schema: `ghost.compare.gate/v1`). Composes over existing `compareFingerprints`, `readSyncManifest`, and `checkBounds` — no new orchestration.
