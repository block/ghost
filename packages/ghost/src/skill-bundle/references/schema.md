# Portable Fingerprint Package Schema Reference

Canonical package:

```text
.ghost/
  config.yml                    optional local routing
  fingerprint/
    manifest.yml                ghost.fingerprint-package/v1
    intent.yml                   core surface intent
    inventory.yml               core material and source links
    composition.yml             core patterns
    validate.yml      optional ghost.validate/v1 gates
```

Git is the approval boundary: checked-in `fingerprint/` core files are
canonical, and uncommitted or unmerged edits are draft work.

`manifest.yml`:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

Layer files are raw YAML. Ghost assembles them into an internal
`ghost.fingerprint/v1` document.

Use these typed refs:

- `intent.situation:<id>`
- `intent.principle:<id>`
- `intent.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `validate.check:<id>`

`inventory.sources[].kind` may be `registry`, `file`, `url`, or `package`.

`fingerprint/validate.yml` remains deterministic only. Ref-backed
checks are preferred; missing or unresolved derivation refs lint as warnings.
Inventory refs can support a check but do not establish surface guidance alone.
