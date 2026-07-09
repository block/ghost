---
"@design-intelligence/ghost": patch
---

`ghost review` now resolves package-relative `materials/…` locators to their repo-relative form before matching diff paths, so packages living below the repo root offer their value checks correctly.
