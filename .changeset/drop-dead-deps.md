---
"@design-intelligence/ghost": patch
---

Drop two unused runtime dependencies (`jiti`, `tinyglobby`) — neither was imported anywhere in source. Ghost now ships three runtime deps (`cac`, `yaml`, `zod`), shrinking the install footprint by ~1.8 MB. Also fix the build to clear `tsconfig.tsbuildinfo` so `dist/` no longer retains deleted modules from incremental builds (the packed package drops from ~1.9 MB / 777 files to ~397 KB / 248 files).
