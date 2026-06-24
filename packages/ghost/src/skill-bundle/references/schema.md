# Portable Fingerprint Package Schema Reference

Canonical package:

```text
.ghost/
  manifest.yml                  ghost.fingerprint-package/v1
  intent.yml                    core surface intent
  inventory.yml                 core material and source links
  composition.yml               core patterns
  validate.yml                  optional ghost.validate/v1 gates
```

Git is the approval boundary: checked-in Ghost package facet files are
canonical, and uncommitted or unmerged edits are draft work.

The flat package is Ghost's default shape. Advanced repos may add
`.ghost/dialect.yml` or pass `ghost relay gather --dialect <file>` as a custom
Relay config for explicit extra facets. Custom facets are Ghost-readable only
when they declare a lane, capabilities, and deterministic projection; a schema
name alone is not enough. OSS Ghost does not infer proprietary ontology from
arbitrary YAML, and authored stack files are not Ghost Relay source-of-truth.

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
