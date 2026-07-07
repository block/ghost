---
"@design-intelligence/ghost": minor
---

Removes the optional-capability subsystem and its per-capability manifest schema. Checks are now a core capability in a flat `.ghost/checks/` directory: scaffold with `ghost checks init` (or `ghost init --with checks`), and `ghost export --no-checks` replaces the old exclusion flag. `ghost validate` flags packages still using the old nested checks location.
