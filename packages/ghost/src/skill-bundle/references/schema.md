---
name: schema
description: The Ghost fingerprint package shape: flat brand-truth nodes, optional materials, optional checks, glossary, and manifest.
---

# Ghost Fingerprint Package Reference

Canonical package:

```text
.ghost/
  manifest.yml        ghost.fingerprint-package/v1: schema + id
  glossary.md         kind vocabulary + meanings
  materials/          bundled materials; never a node source
  <kind>.<slug>.md    a brand truth of a declared kind
  <slug>.md           a brand truth without a kind
  haunts/             optional attached capabilities; never a node source
```

Reserved at the root: `manifest.yml`, `glossary.md`, `materials/`, and
`haunts/`. Every other `*.md` is a node.

## Glossary

The glossary frontmatter declares kind names. A kind may also declare `posture: wild`; omitted posture defaults to `steady`. Wild kinds hold nodes that push past the fingerprint rather than conform to it, so default `ghost gather` excludes them unless `--wild` is explicit.

```yaml
kinds:
  - name: principle
  - name: provocation
    posture: wild
```

## Nodes

A node is markdown with frontmatter and a prose body:

```markdown
---
description: Logo lockups, clearspace, and when the glyph can stand alone.
materials:
  - brand/logo*.svg
  - https://figma.com/file/example?node-id=logo-lockups
---

Use the full lockup when recognition matters. Use the glyph only when space is
constrained or when brand presence should recede.
```

- **Identity** is the filename minus `.md`.
- **Kind** is the first dotted segment of the filename.
- `description` is the retrieval payload shown by `ghost gather`.
- `materials` is optional and accepts repo-relative paths/globs plus absolute
  HTTPS URLs. It is a locator list, not guidance or metadata.

## Haunts

A haunt is an optional capability attached to the fingerprint. Each haunt is a
directory under `.ghost/haunts/<id>/`, anchored by a thin manifest:

```yaml
# .ghost/haunts/checks/haunt.yml
schema: ghost.haunt/v1
id: checks
```

Install one with `ghost haunt add <id>`; list with `ghost haunt list`. Haunts
are feed-back only: nothing inside `haunts/` is ever gathered or pulled.

## Checks (the first haunt)

Checks live under `.ghost/haunts/checks/*.md` and are not nodes:

```markdown
---
name: logo-clearspace-holds
description: Logo usage preserves clearspace and lockup integrity.
severity: medium
references:
  - asset.logo
---

Grade whether the change preserves the logo guidance in `asset.logo`.
```

`references` are node ids with optional heading anchors (`asset.logo > Glyph`).
`ghost validate` warns when a reference does not resolve. `ghost review` uses
checks to assemble an advisory packet for a diff; the host agent judges findings.
Without the checks haunt installed, `ghost review` exits with a hint to run
`ghost haunt add checks`.

## Manifest

```yaml
schema: ghost.fingerprint-package/v1
id: acme-brand
```

The manifest anchors the package with schema version and slug id.

## Gather / Pull / Review

- `ghost gather` emits the node menu only. Checks are invisible.
- `ghost pull` emits selected node bodies and inlines small local materials by default.
- `ghost review` matches diff files to local node materials, offers relevant
  checks, and emits a packet for the agent.
