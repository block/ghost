---
"@anarchitecture/ghost-fingerprint": minor
---

Add cross-package inheritance via `extends`. A package's `manifest.yml` can declare `extends: { <id>: <dir> }`, mapping another contract's identity to where it lives. Node refs then reference inherited context by identity, never path — `relates: [{ to: brand:core/trust }]` (the `<package-id>:<path>` form replaces the earlier npm-style `<pkg>#<id>` ref grammar). Inherited nodes load read-only and flow into gather and validate like local ones. `ghost validate` resolves cross-package refs and reports unresolved refs, packages not declared in `extends`, identity mismatches, and cross-package cycles. This delivers the shared-brand story: one brand contract extended by many products, without copy-paste or merge. One level of `extends` in v1 (no transitive); location is an explicit relative dir (identity-based discovery is a future upgrade that keeps refs unchanged).
