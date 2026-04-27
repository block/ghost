---
"ghost-expression": patch
---

Branch the profile recipe by detected repo kind. The recipe now reads `design_system.token_source`, `composition.frameworks`, `registry`, and `platform` from `map.md` and chooses one of three sampling strategies — ui-library (default), token-pipeline (sample at layer level through YAML graph), or consumer-of-external-DS (record upstream slugs and override patterns instead of resolving to hex). Library-mode `feature_areas` guidance now distinguishes component categories from token-architecture layers. No schema changes.
