---
name: schema
description: The Ghost fingerprint package shape: flat nodes, derived concreteness, Skeletons, probes, and checks.
---

# Ghost Fingerprint Package Reference

Canonical package:

```text
.ghost/
  manifest.yml        ghost.fingerprint-package/v1: schema + id + optional cover
  glossary.md         kind vocabulary + meanings
  materials/          bundled materials; never a node source
  <kind>.<slug>.md    a brand truth of a declared kind
  <slug>.md           a brand truth without a kind
  checks/             optional review assertions; never a node source
```

Reserved at the root: `manifest.yml`, `glossary.md`, `materials/`, and
`checks/`. Every other `*.md` is a node.

## Manifest

`manifest.yml` declares `schema`, `id`, and optionally `cover`. `cover` is a
node id. When present and resolved, `ghost gather` inlines that node above the
menu on every invocation. Use it for what selection cannot reliably retrieve:
essence, temperature, and brand-only refusals.

`ghost validate` enforces the cover contract: a missing referenced cover is an
error, an undeclared cover is a warning, and a cover body past the one-screen
budget (1500 bytes) is a warning.

## Nodes

A node is markdown with frontmatter and a prose body:

```markdown
---
description: Logo lockups, clearspace, and when the glyph can stand alone.
materials:
  - brand/logo*.svg
  - https://figma.com/file/example?node-id=logo-lockups
---

Use the full lockup when recognition matters.
```

- Identity is the filename minus `.md`.
- Kind is the first dotted segment of the filename.
- `description` is the retrieval payload shown by `ghost gather`: what the node
  governs, the observable condition under which it applies, and what it
  contributes where useful. Avoid broad universal wording unless universal
  retrieval is intended.
- `materials` accepts repo-relative paths/globs plus absolute HTTPS URLs. It is
  a locator list, not guidance.

Ghost derives whether a node carries concrete material from structure:
non-empty `materials`, a fenced code block of at least 3 lines, or a
`## Skeleton` section. `gather` reports these payload labels for clarity; they
are not ranking signals.

## Skeleton convention

A `## Skeleton` section contains the literal opening structure for a surface.
It should contain exactly one fenced block; `ghost validate` warns, never fails,
when a Skeleton section has zero or multiple fences.

```markdown
## Skeleton

```tsx
<section>
  <h1>{status}</h1>
  <button>{nextStep}</button>
</section>
```
```

`ghost pull` extracts Skeleton fences and emits them dead last under a banner
instructing the agent to begin from that structure verbatim.

## Checks

Checks live under `.ghost/checks/*.md` and are never gathered or pulled:

```markdown
---
name: logo-clearspace-holds
description: Logo usage preserves clearspace and lockup integrity.
severity: medium
references:
  - asset.logo
probe: pnpm test:logo-clearspace
---

Grade whether the change preserves the logo guidance in `asset.logo`.
```

`references` are node ids with optional heading anchors. `probe` is optional: a
repo-root shell command that `ghost review` runs for offered checks by default
(timeout 30s; stdout/stderr truncated). Probe output is evidence only, never a
Ghost pass/fail verdict. Use `ghost review --no-probes` to skip. Trust model:
probes are the same class as npm scripts; Git review is the boundary.

## Gather / Pull / Review

- `ghost gather` emits the cover above Available guidance, then coverage counts.
  The guidance list is complete, unfiltered, and unranked. Checks are invisible.
- `ghost pull` emits selected nodes in steering order and inlines small local
  materials. Binary local materials become inspect-pointers.
- `ghost review` matches diff files to local node materials, offers relevant
  checks, embeds probe evidence, and emits a packet for the host agent to
  judge.
