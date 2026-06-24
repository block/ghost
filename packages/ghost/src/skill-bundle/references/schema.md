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
`.ghost/relay.yml`, pass `ghost relay gather --config <file>`, or set
`GHOST_RELAY_CONFIG=<relative-file>` to declare extra Relay context sources.
Extra project files are Ghost-readable only when they are listed as Relay
config sources; a schema name alone is not enough. OSS Ghost does not infer
proprietary ontology from arbitrary YAML, and authored stack files are not Ghost
Relay source-of-truth.

Relay configs choose the context-gathering base runtime. Omitted `base` means
`base.kind: fingerprint`, which preserves the default `.ghost` fingerprint
stack. Explicit `base.kind: none` lets a host framework gather declared request
context without a `.ghost` package. In that mode, use `context.sections`,
`context.extras`, source, gaps, and trace from `ghost.relay.gather/v2`; the
top-level `selected_context` is intentionally sparse.

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
