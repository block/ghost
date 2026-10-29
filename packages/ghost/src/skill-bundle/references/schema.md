---
name: schema
description: >-
  The deterministic ghost package contract: layout, manifest, nodes, materials,
  Skeletons, checks, and command behavior.
---

# ghost Package Reference

```text
.ghost/
  manifest.yml
  glossary.md                 optional kind vocabulary and selection prose
  framing.md                  brand framing, delivered automatically
  identity.color.md
  interface.email.md
  materials/                  facts and assets, never selectable nodes
  checks/                     review assertions, never generation context
```

## Manifest and package roles

`manifest.yml` contains `schema: ghost.package/v1` and a lowercase slug `id`.
A brand adds `baseline: "0.35.0"`, the baseline version it was authored against,
not a pin. A baseline instead declares `version` (string) and/or `core` (a
nonempty list of baseline fundamentals node ids). Combining `baseline` with
`core` or `version` is invalid. `cover` is rejected in layered packages. Legacy packages retain their declared
cover and descriptive headers with a deprecation warning: rename the cover node
to framing.md and remove `cover`, remove descriptive node keys, and declare
manifest baseline to migrate.

A package is layered exactly when its manifest declares `baseline`, `core`, or
`version`. Other packages remain legacy: no external baseline is added and
pulls retain steering/given ordering without dependency expansion. Validate
warns that any legacy node `requires` is ignored. Declaring `core` makes the
package a baseline, so a legacy manifest cannot carry `core`.

`framing.md` is the fixed brand framing node. Gather excludes it; pull delivers
it before the selected guidance. Only this node may carry
`## If no guidance applies`. Validation warns when legacy framing is absent,
when framing lacks that heading, or when its body exceeds the advisory
1500-byte budget. Layered brands require framing; missing or invalid framing fails pull.
Baselines do not need framing. When framing has no fallback
policy, pull supplies the ordinary ghost fallback.

## Filename identity and node headers

Node ids are filenames minus `.md`. For layered packages, filenames carry scope
and layer: `[baseline.]<layer>.<topic>.md`; `framing.md` is the special bare name.
Kind is the first segment after any `baseline.` prefix.
`baseline.interface.email.md` is baseline/interface, kind `interface`;
`identity.color.md` is brand/identity, kind `identity`. Legacy files keep
free-form kinds, descriptive frontmatter, and bare names without layered classification
in their output. `--baseline` is ignored with an informational notice.

```markdown
---
for: Making a branded email.
requires: [baseline.interface.email, identity.color, identity.type]
materials:
  - materials/tokens.css
  - locator: figma://file/example
    note: Approved layouts
---

## Usage

Apply the brand's email-specific decisions alongside the baseline.
```

Only `for`, `requires`, and `materials` are accepted in layered node frontmatter.
`scope` and `layer` are derived and rejected as authored keys. `for` is the
situation or activity the agent matches at gather. `requires` is an array of
exact ids to deliver transitively; it declares no override authority.
`materials` lists explicit local files or `https:`, `mcp:`, `figma:`, `github:`
locators, as strings or `{ locator, note }` objects. Globs are invalid. ghost
does not fetch or authenticate external locators.

The glossary is optional. When supplied, its frontmatter declares kinds and
its body gives selection prose under one heading per kind. Gather prints the
kind prose once above its entries. Built-in layer selection prose is handled
separately from the filename and manifest contract.

## External baseline and delivery

Layered brands use the baseline shipped with ghost automatically.
Supply `--baseline <dir>` on gather, pull, validate, and review to substitute
another baseline. Only a brand manifest declaring `baseline` consumes it; legacy
packages ignore it. The external baseline declares `core` and/or `version`,
contains baseline-prefixed nodes, and resolves dependencies locally. Node and
check ids must be unique across the two packages. Materials and checks retain
their owning directory. Glossaries validate separately. Shared built-in kinds keep both selection
legends under one menu heading; duplicate custom kinds remain errors.

Gather excludes framing and core from its selectable `nodes`, exposing core as
`automatic`. Pull expands core, selection, and transitive prerequisites once.
Framing is first; the rest follows baseline fundamentals, baseline interfaces,
brand identity, brand interfaces, and custom kinds, with prerequisites before
dependents. Both steering and given order use that layered assembly. Cycles,
invalid core targets, and missing required nodes fail pull. Unrelated invalid
nodes remain diagnostics. An all-miss selection emits no packet.

Embedded hosts use `resolveGhostPackage(dir, cwd, baselineDir)` and
`lintGhostPackage(dir, cwd, baselineDir)`. `snapshot.baseline` records the external
input, `snapshot.core` holds automatic fundamentals, and pulled nodes carry their
owning `packageDir`. Preserve `--baseline` on subsequent material lookups.
JSON packets and new tape events use `framing` for the unconditional node;
`requested` excludes that alias, and `ids` contains delivered non-framing ids.
Layered pulls contain one authority instruction; delivery order adds no authority.

## Baseline releases and compatibility

The reviewed baseline payload lives in `packages/ghost/src/baseline/`. The build
copies it to `dist/baseline/` and stamps its manifest `version` from the public
package's release version. Refresh content by updating that source directory in
Git and rebuilding; a release never reads another checkout or fetches guidance.
The current payload is a placeholder copied from ghost-internal's existing
baseline, with delivery headers migrated. The design-content rebuild is separate.

An explicit `--baseline` directory supplies its own version and entirely replaces
the bundle. Validate warns for an unversioned baseline and for an effective
version newer than the brand's authored-against `baseline`. Newer means SemVer
2.0 precedence: numeric major/minor/patch, prereleases below the corresponding
release, and build metadata ignored. Invalid compatibility versions warn too.
The declaration is compatibility information, never a version pin.

## Packet and event provenance

Snapshots, gather, pull, and review packets carry `provenance` with `package`
and `baseline` identities: `{ id, version, hash }`. Missing versions and absent
baselines are explicit `null`. A standalone baseline records itself as baseline;
legacy packages have no effective baseline. New gather/pull tape events carry the
same identities. Markdown packets append one machine-readable
`<!-- ghost provenance {...} -->` footer. JSON and new events use `framing`,
replacing the old output `cover` field; legacy authored manifests still accept
their compatibility key. Existing historical events remain readable.

Hash format is `sha256:<hex>`, domain `ghost.package.sha256/v1` followed by a NUL
byte. Enumerate package-relative paths using `/`, skipping dotfiles and dot
folders such as `.events` and `.git`. Sort paths by JavaScript string order,
independent of locale. For each path hash three byte fields: kind (`file` or
`symlink`), UTF-8 relative path, and content. Each field begins with its unsigned
64-bit big-endian byte length. Regular files contribute exact bytes, including
checks and material files; symlinks contribute their UTF-8 target text and are
never followed for hashing. Validation rejects links that resolve outside the
package, including other files in the repository, and links whose targets cannot
be resolved. Valid internal links retain the existing hash encoding. Empty directories, timestamps, permissions, absolute package
locations, and bytes behind external references do not participate. A hash
identifies the package content, not mutable external material or the artifact.

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
- `ghost pull` emits framing before selected guidance in steering
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
  framing. Framing is not added automatically. Unknown IDs stop review with
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
file outside the package is invalid at package validation. An internal link
outside materials is referenced material: inspection requires explicit permission,
and pull applies the referenced-file inline limit. Links within the materials directory
remain usable. Outside-repo targets stay unavailable.

Pull still inlines eligible referenced text by default. Hosts that need
explicit permission for each read should pull with `inlineMaterials: false`,
then inspect under their chosen policy.
