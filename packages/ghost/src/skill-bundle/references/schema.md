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
node id. When present and resolved, `ghost gather` inlines that node above the
menu on every invocation.

`ghost validate` reports a missing referenced cover as an error, an undeclared
cover as a warning, and a cover body over 1500 bytes as a warning.

## Glossary and identity

`glossary.md` declares the package's kind vocabulary and defines each kind. A
node's id is its filename minus `.md`; its kind is the first dotted filename
segment. A bare filename has no kind. Undeclared kind prefixes warn.

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
last under the begin-from-this-structure banner.

## Checks

Checks live under `.ghost/checks/*.md` and are never gathered or pulled:

```markdown
---
for: Logo usage must preserve clearspace and lockup integrity.
severity: medium
references:
  - asset.logo > Clearspace
---

Grade whether the change preserves the logo guidance in `asset.logo > Clearspace`.
```

A `ghost.check/v2` frontmatter block contains exactly `for`, `severity`, and
`references`. `for` is the non-empty semantic situation where the check
applies, never a path; it is the same field nodes use for their retrieval
payload. `severity` is `high`, `medium`, or `low`. `references` is
a non-empty list of node ids with optional `> Heading` anchors. Every reference
must resolve during `ghost validate`; unresolved nodes and missing headings are
errors. Write the guidance node first, then the check in the same change.

The removed check keys are `context`, `name`, `description`, `source`, `tools`,
and `turn_limit`. Compatibility with `.agents/checks` ended because grounding every
check in written guidance is mandatory. Check bodies are review instructions for
the host agent. ghost validates and transports checks; it does not grade them.

## Command behavior

- `ghost gather` emits the cover, coverage counts, then a complete, unfiltered,
  unranked node menu. Checks are absent.
- `ghost pull` emits selected nodes in steering order, inlines eligible local
  text materials once, leaves later duplicate pointers, turns binary materials
  into inspect-pointers, and leaves external materials as locators.
- `ghost review [...checkIds]` emits a one-shot grounded review packet with
  touched files, selected checks, cited guidance excerpts, guidance materials,
  and the diff. With no ids it includes all checks; with ids it filters by check
  id and suggests close matches for unknown ids.
- `ghost export` bundles the package and audits which locators travel.
- `ghost stats` summarizes local gather and pull events.
