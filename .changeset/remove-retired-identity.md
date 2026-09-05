---
"@design-intelligence/ghost": minor
---

BREAKING: focus ghost on one package identity. Use `ghost` instead of the removed executable alias, `/package` instead of the removed `/fingerprint` and `/scan` exports, `ghost stats` instead of `ghost pulse`, `ghost.package/v1` in manifests, `parseCheckReference` instead of `parseSourceRef`, `packageId` instead of `fingerprintId`, and omit the removed `--template skeleton` flag. Install the skill with `ghost skill install`; the standalone curl installer is removed.
