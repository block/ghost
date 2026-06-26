---
"@anarchitecture/ghost": minor
---

Add `ghost migrate`: transform a legacy `.ghost/` package onto the surface model
— derive `surfaces.yml` from old `topology.scopes`, place single-scope nodes via
`surface:`, and report (never guess) any node it cannot place unambiguously.
