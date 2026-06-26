# Portable Fingerprint Package Schema Reference

Canonical package:

```text
.ghost/
  manifest.yml                  ghost.fingerprint-package/v1
  intent.yml                    core surface intent
  inventory.yml                 core material and source links
  composition.yml               core patterns
  surfaces.yml                  optional ghost.surfaces/v1 coordinate space
  checks/*.md                   optional ghost.check/v1 markdown checks
  validate.yml                  optional ghost.validate/v1 gates
```

Git is the approval boundary: checked-in Ghost package facet files are
canonical, and uncommitted or unmerged edits are draft work.

`surfaces.yml` declares the coordinate space — the surfaces a fingerprint's
nodes are placed on (`surface:`) and the containment tree (`parent`) plus typed
composition edges. The contract carries no paths. A repo binds paths to surfaces
with `.ghost.bind.yml` (`ghost.binding/v1`) or by directory location; a nested
`.ghost/` binds its subtree, it does not carry its own merged fingerprint. A
binding's `contract:` is `.` (the in-repo contract) or an npm package name
(`@scope/brand`, resolved from `node_modules`); `ghost verify` checks an external
contract resolves and its bound surfaces exist.

`ghost gather <surface>` composes a surface's slice (own nodes + inherited
ancestors + edge contributions). `ghost gather --path <file>` resolves the
surface that owns a path via its binding. With no surface, `gather` returns the
surface menu for the host agent to match against.

`manifest.yml`:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

Facet files are raw YAML. Ghost assembles them into an internal
`ghost.fingerprint/v1` document.

Use these typed refs:

- `intent.situation:<id>`
- `intent.principle:<id>`
- `intent.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `validate.check:<id>`

`inventory.sources[].kind` may be `registry`, `file`, `url`, or `package`.

`validate.yml` remains deterministic only. Ref-backed
checks are preferred; missing or unresolved derivation refs lint as warnings.
Inventory refs can support a check but do not establish surface guidance alone.
