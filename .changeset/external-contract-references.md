---
"@anarchitecture/ghost-fingerprint": minor
---

Bindings can reference an external contract: a `.ghost.bind.yml` `contract:` now
accepts an npm package name (`@scope/brand`) in addition to `.` (in-repo),
resolved from `node_modules`. `ghost verify` checks the external contract
resolves and that each bound surface exists in it. External fingerprint loading
for grounding remains a follow-up.
