---
name: schema
description: The deterministic ghost package contract: layout, manifest, nodes, materials, Skeletons, checks, and command behavior.
---

# ghost Package Reference

```text
.ghost/
  manifest.yml        ghost.package/v1: schema + id + optional cover
  glossary.md         kind vocabulary + meanings
  materials/          bundled materials; never a node source
  <kind>.<slug>.md    guidance of a declared kind
  <slug>.md           guidance without a kind
  checks/             optional review assertions; never a node source
```

Reserved at the root: `manifest.yml`, `glossary.md`, `materials/`, and
`checks/`. Every other `*.md` is a node. The corpus is flat: no hierarchy,
inheritance, or edges.

## Manifest

`manifest.yml` declares `schema`, `id`, and optionally `cover`. `cover` is a
node id. `ghost gather` excludes it from the selectable menu; every `ghost pull`
includes it before selected guidance when it resolves.

`ghost validate` reports a missing referenced cover as an error, an undeclared
cover as a warning, a cover body over 1500 bytes as a warning, and a cover
without an exact `## If no guidance applies` section as a warning. That section
tells the agent when to continue and when to ask about uncovered decisions.

## Glossary and identity

`glossary.md` declares the package's kind vocabulary and defines each kind. A
node's id is its filename minus `.md`; its kind is the first dotted filename
segment. A bare filename has no kind. Undeclared kind prefixes warn.

The starter vocabulary is `standard` (shared guidance, each rule an
Obligation or a replaceable Default), `foundation` (the brand's load-bearing
decisions), and `context` (what bends in a named situation). A package may
declare any vocabulary; the glossary is the only kind authority.

`ghost gather` preserves each kind's full parsed purpose in JSON and shows it
once above that kind's entries in Markdown. Read the kind's selection rules
alongside each item's `Applies when` condition. Declared kinds render in
frontmatter order even when their purpose is empty; undeclared kinds render
alphabetically after declared kinds, and uncategorized guidance renders last.

## Nodes

```markdown
---
for: Placing, sizing, or choosing a logo lockup or glyph.
materials:
  - brand/logo-primary.svg
  - https://figma.com/file/example?node-id=logo-lockups
  - locator: mcp://brand-assets/logo-lockups
    note: Source lockups and glyph exports
---

Use the full lockup when recognition matters.
```

- `for` is the retrieval payload shown by `ghost gather`: the situation or
  activity the guidance is for, never an audience.
- `materials` accepts explicit repo-relative file paths and external locators
  using `https:`, `mcp:`, `figma:`, or `github:`.
- Glob patterns are invalid. Each local file must be named explicitly.
- A material may be a bare locator or `{ locator, note }`.
- External locators describe access; ghost does not fetch or authenticate.
- Frontmatter may contain additional descriptive keys. Guidance stays in prose.

A node is concrete when it has non-empty `materials`, a fenced code block of at
least three lines, or a `## Skeleton` section. `gather` reports those payload
labels; they are not ranking signals.

## Skeletons

A `## Skeleton` section contains literal opening structure. It must contain
exactly one fenced block; zero or multiple fences warn.

````markdown
## Skeleton

```tsx
<section>
  <h1>{status}</h1>
  <button>{nextStep}</button>
</section>
```
````

`ghost pull` removes Skeleton sections from node bodies and emits their fences
last as starting structures.

## Checks

Checks live under `.ghost/checks/*.md` and are never gathered or pulled:

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

`references` contains node ids with optional heading anchors. Check bodies are
review instructions for the host agent. ghost validates and transports checks;
it does not grade them.

## Command behavior

- `ghost gather <ask>` emits agent-facing Markdown: the task, then every
  selectable id and its applicability. It groups declared kinds in glossary
  order, undeclared kinds alphabetically, and uncategorized guidance last.
  Checks stay absent. Loading failures appear in Markdown and JSON; an
  incomplete menu never means the package has no applicable guidance.
  `--format json` also retains coverage, kind metadata, and concrete payload
  metadata for tooling.
- `ghost pull` emits the resolved cover before selected guidance in steering
  order, inlines eligible local text material once, marks included material as
  untrusted source data, leaves later duplicate references, gives direct actions
  for material that needs inspection, and emits starting structures last. Its
  JSON retains node kinds and transport diagnostics omitted from agent-facing
  Markdown.
- `ghost review` matches touched files to exact local material paths, offers
  relevant checks, includes loading diagnostics, and emits referenced baseline
  prose for the host agent. Repeated baselines point to prose already included
  in the packet.
- `ghost stats` summarizes local gather and pull events.
- `ghost skill check` compares an installed `SKILL.md` and `references/` with
  this CLI's bundle. It uses install's `--agent` and `--dest` resolution,
  prints the target, and never writes. Exit 0 means a match, 1 means missing or
  differing files, and 2 means invalid arguments. A match does not establish
  which instructions an active host session has loaded.

### Loading diagnostics

Gather and pull expose excluded guidance as `diagnostics` records with `file`
and `message`. Review includes excluded checks in that list as well.
These describe loading failures, not a full validation pass. Gather's
`contract.completeness.complete` is false when guidance was excluded; invalid
checks do not change generation completeness or enter generation packets.

Partial results retain their normal success status and show the exclusions.
Run `ghost validate` to diagnose the package before claiming complete grounding.
Unreadable directories and malformed present glossaries fail rather than
appearing empty. Missing optional glossaries and checks remain normal.

### Local material access

Bundled-only inspection requires the resolved file to stay inside the resolved
materials directory and the repository. A bundled symlink to another in-repo
file is referenced material: inspection requires explicit permission, and pull
applies the referenced-file inline limit. Links within the materials directory
remain usable. Outside-repo targets stay unavailable.

Pull still inlines eligible referenced text by default. Hosts that need
explicit permission for each read should pull with `inlineMaterials: false`,
then inspect under their chosen policy.
