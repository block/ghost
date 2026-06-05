# Portable Fingerprint Package Schema Reference

Canonical package:

```text
.ghost/
  config.yml                    optional local routing
  fingerprint/
    manifest.yml                ghost.fingerprint-package/v1
    prose.yml                   core product judgment
    inventory.yml               core material and source links
    composition.yml             core patterns
    enforcement/checks.yml      optional ghost.checks/v1 gates
    memory/intent.md            optional human-approved intent
    memory/decisions/           optional ghost.decision/v1 rationale
    sources/cache/              optional generated observations
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

- `prose.situation:<id>`
- `prose.principle:<id>`
- `prose.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `check:<id>`

`inventory.sources[].kind` may be `cache`, `registry`, `file`, `url`, or
`package`.

`fingerprint/enforcement/checks.yml` remains deterministic only. Ref-backed
checks are preferred; missing or unresolved derivation refs lint as warnings.
Inventory refs can support a check but do not establish product judgment alone.
