---
name: schema
description: The Ghost fingerprint package shape: the flat set of brand-truth nodes, the glossary, and the manifest.
---

# Ghost Fingerprint Package Reference

Canonical package:

```text
.ghost/
  manifest.yml        ghost.fingerprint-package/v1: schema + id
  glossary.md         the category vocabulary + what each category means
  <kind>.<slug>.md    a brand truth of a declared kind (principle.density.md)
  <slug>.md           an uncategorized brand truth (voice.md)
```

The package is a **flat set of nodes** — no hierarchy, no inheritance, no edges.
Folders may be used for human browsing, but they carry no meaning; the model
reads a flat menu. Reserved at the root: `manifest.yml` and `glossary.md`; every
other `*.md` is a node.

Git is the approval boundary: checked-in files are canonical; uncommitted edits
are draft work.

## Nodes

A node is the unit: a markdown file with a `description` in frontmatter and a
brand truth in the prose body. A node at `principle.trust.md`:

```yaml
---
description: Trust at the payment moment.   # the retrieval payload
# free-form keys (audience, stage, …) pass through untouched
---
Prose brand truth. Intent / inventory / composition are authoring lenses,
not fields.
```

- **Identity** is the filename minus `.md` (`marketing.email.md` → `marketing.email`).
- **Kind** is the first dotted segment of the filename (`principle.trust.md` →
  kind `principle`, slug `trust`). A bare name (`voice.md`) has no kind and is
  uncategorized — allowed.
- `description` is how an agent selects a node (like a tool's name +
  description). It is what `gather` puts in the menu.

Moving or renaming a node changes its id.

## Glossary

`glossary.md` declares the category vocabulary and each category's meaning — its
normative weight, so an agent knows how to read a node of that kind.

```yaml
---
categories:
  - name: principle    # a durable stance, true across media unless narrowed
  - name: condition    # a situational truth, fires when its situation holds
  - name: exemplar     # illustrative, not normative on its own
---
```

The frontmatter `categories` list is the machine-readable set of names; a `#`
heading section per category gives its prose meaning. Ghost ships no fixed
vocabulary — the author chooses the kinds. `ghost validate` warns when a node's
kind prefix is not a declared category and suggests the closest one.

## Altitude and conditions

A truth is stated at the altitude it is actually true. A universal truth is
stated plainly. A narrower truth names its **condition** in the prose — the
*situation* it applies in ("when a surface must show many items at once, carry
hierarchy with weight, not color"), never a destination or filing bucket ("for
dashboards:"). The model reads the condition and decides when the truth applies;
that interpretation is the agent's job, not the filename's.

## Manifest

```yaml
schema: ghost.fingerprint-package/v1
id: acme-brand
```

The manifest anchors the package: a schema version and a slug id.

## Gather

`ghost gather` emits the **menu**: every node's id, kind, and description. It does
no selection — the agent reads the ask against the menu and pulls the truths it
judges relevant. There is no slice and no inheritance between nodes. Selection
happens just-in-time, against the actual task.
