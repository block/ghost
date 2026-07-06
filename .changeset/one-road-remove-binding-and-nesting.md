---
"@design-intelligence/ghost": minor
---

Remove the path→surface binding (`ghost.binding/v1`, `.ghost.bind.yml`) and all nesting (fingerprint stacks, cross-package discovery): one contract per package, surfaces are the only locality. `checks` and `review` now take agent-stated `--surface <ids>` instead of resolving surfaces from a diff; `gather` takes only a surface or returns the menu. Removed `gather --path`, `checks --diff`, `lint --all`, `verify --all`, `scan --include-nested`, `emit --path`, `init --scope`, and `init --monorepo`. The agent names the touched surfaces; Ghost no longer infers intent from repo location.
