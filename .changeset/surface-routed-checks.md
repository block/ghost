---
"@anarchitecture/ghost": minor
---

Add surface-routed check relevance: `ghost checks --diff` resolves each changed
path to its surface (via bindings) and selects the markdown checks governing the
touched surfaces and their ancestors (the same inheritance as `gather`). Ghost
selects and emits the relevant checks; it never runs them. A `checks/` directory
in a package holds `ghost.check/v1` markdown checks.
