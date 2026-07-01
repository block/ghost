---
"@anarchitecture/ghost-fingerprint": patch
---

Remove the dormant context-selection machinery (the Job 2 path-selection graph,
`buildContextEntrypoint`, `buildSelectedContext`, and selection-reasons) that was
inert since the coordinate removal and orphaned once `review` moved onto the
surface rails. Internal cleanup; no public surface change.
