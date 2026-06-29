---
status: exploring
---

# Phase 5: node authoring (init, migrate, skill)

Fifth build phase. Where Ghost packages start being **authored as nodes**, not
facets. This is the prerequisite for facet-removal: until `init` and `migrate`
emit nodes, the facet→node projection is load-bearing and cannot be deleted.
Read `phase-2-loader-fold.md`, `phase-3-gather-graph.md`, and
`phase-4-checks-graph.md` first.

## Goal and boundary

Make node packages first-class to author:

- **`init`** scaffolds a node package: `manifest.yml`, `surfaces.yml` (the
  spine), and `nodes/*.md` seeds — not the three facet files.
- **`migrate`** gains a facet→node re-filing path: an existing facet package
  (or legacy package) is rewritten into `nodes/*.md` + `surfaces.yml`.
- **The authoring skill** (`capture.md` + friends) teaches node authoring: write
  prose nodes through the intent/inventory/composition lenses, place with
  `under`, link with `relates`, tag with `incarnation`. This is where the
  why/what authoring burden (Phase 4) actually lives.

Done when a freshly `init`-ed package is a node package, `migrate` converts facet
packages to node packages, the skill documents node authoring, and the whole
thing gathers/checks/reviews on the graph. Facet *removal* is the next phase
(this phase makes it possible by ending facet emission).

## What `init` produces (the new scaffold) — templates, not questions

Today: `manifest.yml` + `intent.yml`/`inventory.yml`/`composition.yml` (empty
facet files). New:

```text
.ghost/
  manifest.yml          # unchanged: schema + id
  surfaces.yml          # the spine — `core` is implicit, near-empty is valid
  nodes/
    core-voice.md       # seed node(s) showing the shape (prose + frontmatter)
```

**`init` is template-driven, not an interactive Q&A wizard (SETTLED).** A wizard
fights BYOA — the CLI is the deterministic calculator; the *skill* asks the
human in conversation. `init` deterministically stamps a named template:

```
ghost init                    # the `default` template
ghost init --template <name>  # (future) other starters
```

- **Template registry seam, built now (one template registered).** A template is
  a pure function/record → a set of seed files (a `surfaces.yml` spine + a few
  `nodes/*.md` written through the lenses). Structure the code so adding
  `marketing` / `voice` / `dashboard` starters later is just registering another
  template — no `init` rework. These map onto the worked scenarios (marketing
  seeds campaign/email/billboard surfaces with incarnation-tagged nodes; voice
  seeds modality/intent-class nodes; etc.).
- **`default` template seeds minimally:** the `surfaces.yml` spine (core
  implicit) + one `core`-placed intent node, so a fresh package is
  self-explanatory and immediately gatherable. Not a fake fingerprint.
- **`--reference` is DROPPED (SETTLED).** Facet-era plumbing
  (`templateInventory(reference)`). Clean house. An author records design
  materials by writing an inventory-nature node, guided by the skill.
- **`init` output** (json/cli summary) changes from `intent/inventory/
  composition` paths to `surfaces.yml` + `nodes/` — update `initCommandOutput`.

## What `migrate` produces (facet → nodes)

`migrate` currently re-files legacy coordinates into facet files + `surfaces.yml`.
Extend it to **emit nodes**:

- For each facet entry (principle/pattern/contract/situation/exemplar), write a
  `nodes/<id>.md` whose frontmatter is `id` + `under: <surface>` (+ `relates`
  from `check_refs`/edges where translatable) and whose **body is the entry's
  prose** (principle text / pattern text / etc.). This is the
  `projectFacetsToNodes` logic (Phase 2) made *persistent* — the projection
  becomes the migration writer.
- Keep `surfaces.yml` emission as-is (the spine).
- **Stop writing facet files.** After migrate, the package has `manifest.yml` +
  `surfaces.yml` + `nodes/*.md` and no `intent.yml`/`inventory.yml`/
  `composition.yml`.
- Migration notes flag anything lossy (evidence/check_refs that don't translate
  cleanly), consistent with the lossy-projection stance.

This makes `migrate` the tool that converts *every existing facet package*
(including Ghost's own dogfood packages and fixtures) to nodes — which is what
lets the facet loader + projection be deleted next phase.

## The authoring skill (the real home of why/what)

Update `capture.md` (and the bundle) to teach node authoring:

- A node is a markdown file in `nodes/`: frontmatter (`id`, `under?`, `relates?`,
  `incarnation?`) + a prose body.
- The body is written through the **intent / inventory / composition lenses** —
  the ephemeral authoring guidance: capture the *why* (intent), the *material*
  (inventory, incl. pointers to component code), and the *composition* (patterns).
  These are prompts to the author, never fields.
- Place with `under` (the tree / cascade); the brand soul lives at `core`.
- Link laterally with `relates` (`reinforces`/`contrasts`/`variant`) when a
  relationship carries rationale; when the rationale is rich, write a
  relationship-node (its body explains the tension).
- Tag with `incarnation` only for medium-bound expressions; leave essence
  untagged.
- This is where Phase 4's "the why and what live in the prose" is *taught* —
  the skill is what ensures grounded nodes actually contain both.

## Files

- `init-command.ts` + `initFingerprintPackage`: scaffold surfaces + nodes, drop
  facet-file emission, update output shape.
- `scan/fingerprint-package.ts` templates: replace `templateIntent/Inventory/
  Composition` with `templateSurfaces` + `templateNode(s)`.
- `migrate-command.ts` + `scan/migrate-legacy.ts`: add the node-emitting writer
  (reuse the projection mapping); stop writing facet files.
- `skill-bundle/references/capture.md` (+ SKILL.md, authoring-scenarios.md,
  patterns.md, voice.md as needed): node-authoring guidance.

## Tests

- `init` produces `manifest.yml` + `surfaces.yml` + `nodes/*.md`; no facet files;
  the result loads and gathers.
- `migrate` converts a facet package to nodes; bodies preserved; surfaces spine
  intact; lossy items noted; no facet files remain.
- Skill bundle manifest updated (capture.md changes; install manifest still
  matches).
- CLI: init → gather round-trips on the node package.

## Explicitly NOT in Phase 5

- Deleting the facet loader / facet schemas / `projectFacetsToNodes` /
  `resolveSurfaceSlice` / `groundSurface` — that is the **facet-removal phase**,
  which this unblocks. (The loader keeps reading facets *and* nodes during the
  transition so old packages still load until migrated.)
- Cross-package authoring (`@scope/pkg#id`) — Phase 6.
- The `surface`→`node` rename of symbols.
- Multi-node `init` templates / scaffolding wizards — keep `init` minimal.

## Settled decisions

1. **`init` is template-driven** (registry seam now, `default` template only;
   no Q&A wizard). `default` seeds the spine + one `core` node.
2. **`--reference` dropped.** Clean house; materials become an inventory node.
3. **`migrate` is one-way (no `--keep-facets`).** It rewrites the package into
   the node form and removes the facet files. Git history preserves the old
   files; keeping both invites two-sources-of-truth drift. The transition loader
   still reads any not-yet-migrated package.
4. **Node granularity: file = purpose, not atom (SETTLED).** A node is a
   *purpose-coherent, frontmatter-uniform* body of **any length** — 1 or 100
   prose points about that purpose live in one node. The body length is
   irrelevant; what forces a second file is a **divergence in the handles**:
   a different `under` (placement), a different `incarnation` (medium), or a
   genuinely different `relates` role (e.g. a relationship-node that connects two
   others). So `core-voice.md` can be three paragraphs (one node);
   `launch-email.md` and `launch-billboard.md` are separate *because their
   `incarnation` differs*, not because they are different ideas. One node per
   file; grouped-files remain a possible later authoring convenience, not now.

## Read-back

Phase 5 succeeds if `init` scaffolds a node package (`surfaces.yml` + `nodes/`),
`migrate` rewrites facet/legacy packages into nodes (bodies preserved, spine
intact, lossy items noted, no facet files left), and the skill teaches node
authoring with the intent/inventory/composition lenses as the why/what home —
all gathering/checking/reviewing on the graph, with the facet loader still
reading legacy packages until the facet-removal phase deletes it.
