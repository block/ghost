---
name: schema
description: >-
  The deterministic ghost package contract: layout, manifest, nodes, materials,
  Skeletons, checks, and command behavior.
---

# ghost Package Reference

```text
.ghost/
  manifest.yml        ghost.package/v1: schema + id + optional cover/core
  glossary.md         kind vocabulary + meanings
  materials/          bundled materials; never a node source
  <kind>.<slug>.md    guidance of a declared kind
  <slug>.md           guidance without a kind
  checks/             optional review assertions; never a node source
```

Reserved at the root: `manifest.yml`, `glossary.md`, `materials/`, and
`checks/`. Every other `*.md` is a node. The files and selection menu are flat. Optional content layers and explicit
prerequisites do not imply directory hierarchy or inheritance.

## Manifest

`manifest.yml` declares `schema`, `id`, and optionally `cover` and `core`. `cover` is a
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

## Layered fingerprints

Scope and layer are first-class consumed metadata, independent of filename kinds:

| Scope | Legal layers | Purpose |
| --- | --- | --- |
| `baseline` | `fundamentals`, `interface` | General design foundations and medium-specific defaults |
| `brand` | `framing`, `identity`, `interface` | Brand stance, explicit identity decisions and medium-specific expression |

Declare both `scope` and `layer`, or neither. Unclassified packages keep their
existing output. `materials` remains the locator field, not a layer. `requires`
is an optional array of exact local node IDs. It includes those prerequisites
transitively, never an inferred relationship or an authority override.

```yaml
schema: ghost.package/v1
id: example-brand
cover: framing
core: [baseline.fundamentals.core]
```

`core`, when declared, is a nonempty list of baseline/fundamentals IDs. Keep it
small: actual fundamentals such as legibility, hierarchy and accessibility,
not an authority-only node. Larger fundamentals remain selectable. There is no
arbitrary size limit and no semantic inspection of prose. The cover remains a
separate manifest role; a layered brand uses its `brand/framing` node as cover.

A flat file layout can express the full structure:

```text
manifest.yml
framing.md
baseline.fundamentals.core.md
baseline.fundamentals.composition.md
baseline.fundamentals.typesetting.md
baseline.fundamentals.accessibility.md
baseline.interface.email.md
baseline.interface.deck.md
baseline.interface.document.md
baseline.interface.web.md
baseline.interface.product.md
identity.color.md
identity.type.md
interface.email.md
interface.email.receipt.md
interface.deck.md
interface.deck.pitch.md
interface.document.md
interface.document.report.md
```

For example, `interface.email.md`:

```markdown
---
for: Making a branded email.
scope: brand
layer: interface
requires:
  - baseline.interface.email
  - identity.color
  - identity.type
---

Apply the identity palette to one primary action. Keep supporting links quiet.
```

Each brand/interface node must require at least one baseline/interface node,
directly or transitively. A variant can require its base brand interface.
Identity nodes may require fundamentals such as `baseline.fundamentals.typesetting`;
these dependencies are explicit, not inferred from names or prose. The author
chooses the correct medium pairing; validation checks classification and reachability,
not whether email guidance semantically matches an email.

Gather remains the complete flat selection menu, with scope/layer on entries.
It excludes the cover and core from `nodes`, and exposes core separately as
`automatic`. The field is absent for manifests without core. Coverage counts
selectable entries only. Do not select automatic nodes. Bare pull delivers the
cover and core even when no selectable guidance applies.

Pull expands core, selected nodes and all explicit prerequisites, with no duplicate
bodies or inlined materials. The cover retains its separate first position; the
remaining guidance is ordered baseline fundamentals, baseline interface, brand
framing, brand identity, brand interface, then unclassified nodes. Prerequisites
precede dependents within that guidance, even when they cross layer order. For
classified or prerequisite-bearing packages, this ordering applies to both
`--order steering` and `--order given`. There is no general precedence engine.

`requested` records explicit selection (deduplicated, excluding the cover alias).
`ids` and pull event IDs record delivered guidance including core and prerequisites;
the cover stays in its separate `cover` field. An all-miss selection still emits no
packet, just as for legacy packages. Missing or invalid required nodes, invalid
core targets, cycles and missing baseline interface pairing fail pull. Validation
checks the whole package; pull checks required context only. Unrelated broken
nodes remain diagnostics rather than blocking an otherwise valid pull.

Classified pull packets contain one `authority` prose field: baseline defaults
yield to explicit brand decisions; exceptions name the changed rule and scope;
requirements cannot be overridden; `requires` does not confer override authority;
framing does not override explicit decisions; unresolved conflicts must be reported;
delivery order is not authority. ghost does not infer semantic conflicts or decide
which prose statements are requirements. Unclassified packets omit this field.

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
  untrusted source data, leaves later duplicate references, turns image and
  binary material into inspect pointers with direct actions, and emits starting
  structures last. Its JSON retains node kinds and transport diagnostics
  omitted from agent-facing Markdown.
- `ghost review` matches touched files to exact local material paths, offers
  relevant checks, includes loading diagnostics, and emits referenced baseline
  prose for the host agent. Repeated baselines point to prose already included
  in the packet.
  Repeat `--node <id>` to add exact guidance IDs, including nested IDs or the
  cover. The cover is not added automatically. Unknown IDs stop review with
  exit 2; duplicates are ignored in first-request order. The flag accepts node
  IDs rather than paths to node files, globs, or heading references.
  Explicit selection adds referencing checks without suppressing material
  matches or always-offered checks. JSON adds `explicitNodeIds` and
  `explicitNodes` only when IDs are supplied; matched nodes keep their prose in
  `materialNodes`. Check provenance retains `matched` or `always` where it
  already applies, uses `explicit` for newly offered checks, and records
  explicit reasons in `explicitVia`. Selected guidance without a check remains
  visible. File coverage gaps are still material-match gaps, not evidence that
  explicitly selected guidance does not apply.
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
