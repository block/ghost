# @design-intelligence/ghost

## 1.0.0

### Major Changes

- [#240](https://github.com/block/ghost/pull/240) [`feddc63`](https://github.com/block/ghost/commit/feddc63a04777d28f4324646d52708f346d7c7b0) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make `skeleton` the only `ghost init` template, removing `minimal`, `composition`, and the legacy `default` and `steering` aliases.

### Minor Changes

- [#242](https://github.com/block/ghost/pull/242) [`2579381`](https://github.com/block/ghost/commit/2579381cb8440e773a9ccbefd8f8c8e3780d6d93) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add the model-free `@design-intelligence/ghost/embed` public contract for embedded hosts and share gather/pull semantics with the CLI.

## 0.24.0

### Minor Changes

- [#239](https://github.com/block/ghost/pull/239) [`6f671f9`](https://github.com/block/ghost/commit/6f671f9fe0e5fa7eea34a4ca45885aade9471737) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds an artifact distillation workflow for reconciling links, images, documents, code, and media with new or existing ghost guidance.

- [#235](https://github.com/block/ghost/pull/235) [`0bf7cda`](https://github.com/block/ghost/commit/0bf7cda63071e82579e0474b9ab3b6f63f55b54c) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds a making-loop recipe to the ghost skill: material inspection, rendered verification with bounded repair, and strengthened exemplar authoring guidance.

- [#236](https://github.com/block/ghost/pull/236) [`65c44e5`](https://github.com/block/ghost/commit/65c44e5c27f8757feeae0c2ce65d8f71cb95258f) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adopt ghost package terminology with the `ghost.package/v1` schema and package API, preserve legacy aliases, and name exported archives `<id>-ghost-package.tgz`.

- [#233](https://github.com/block/ghost/pull/233) [`fe03ff9`](https://github.com/block/ghost/commit/fe03ff924f469a7be58f4137c71ec10489ec76ca) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify gather's applicability contract in markdown and JSON, and make pulled material and Skeleton fences safe around nested backticks.

### Patch Changes

- [#237](https://github.com/block/ghost/pull/237) [`3877efc`](https://github.com/block/ghost/commit/3877efc1fbba28887b961f464eb39d32cad165e5) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Center the public documentation on how agents find and apply brand guidance, with the CLI in a supporting role.

- [#235](https://github.com/block/ghost/pull/235) [`0bf7cda`](https://github.com/block/ghost/commit/0bf7cda63071e82579e0474b9ab3b6f63f55b54c) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - serializeNode preserves the materials frontmatter field instead of dropping it.

## 0.23.0

### Minor Changes

- [#231](https://github.com/block/ghost/pull/231) [`d87886e`](https://github.com/block/ghost/commit/d87886e0727d25c8b0a8d2993e2943293ee216f4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `gather` and `pull` accept an optional run identifier (`--run <id>` or
  `GHOST_RUN_ID`) and stamp it onto their events-tape lines as `run`. Hosts
  that invoke Ghost per task can now attribute tape events to a specific run
  exactly, instead of guessing by time window. When no identifier is supplied,
  tape lines are byte-identical to before — the field is attribution only and
  never affects gather or pull output.

### Patch Changes

- [#231](https://github.com/block/ghost/pull/231) [`d87886e`](https://github.com/block/ghost/commit/d87886e0727d25c8b0a8d2993e2943293ee216f4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - serializeNode preserves the materials frontmatter field instead of dropping it.

## 0.22.1

### Patch Changes

- [#229](https://github.com/block/ghost/pull/229) [`e45fe48`](https://github.com/block/ghost/commit/e45fe4823757af90df4504aced8f5ba3677f03a6) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - serializeNode preserves the materials frontmatter field instead of dropping it.

## 0.22.0

### Minor Changes

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds a manifest `cover` field — gather inlines the named node above the menu, validate enforces it — and re-authors the skeleton starter in designer-native vocabulary: a brand cover, foundation chapters with open questions, context nodes, and a cliche floor paired with checks.

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Removes the glossary posture system. Glossary kinds no longer accept a posture key; `ghost gather` drops the `--wild` flag and lists every node; `ghost pull` orders packets as index, concrete nodes, then prose; `ghost review` reports matched material-backed nodes without a separate review-critical section and renames the `unguarded-material` coverage gap to `unchecked-material`; `ghost pulse` drops the wild usage section. Existing fingerprints keep working: an ignored `posture` key in `glossary.md` frontmatter is tolerated, and anti-goal nodes still gather, pull, and match in review through their materials like any node.

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost validate` warns on nodes without a `description` (rule `node-description-missing`), and the `ghost gather` coverage line reports how many nodes lack descriptions, since an undescribed node is invisible to agent selection.

### Patch Changes

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add the concrete-tiers skill recipe: choosing which concrete code tiers (tokens, skeletons, components, exemplars) a fingerprint carries, and justifying absences.

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Treat the manifest cover as inlined context instead of asking agents to select an `index` node.

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document bound/open pattern authoring and `concept.*` nodes in the capture skill recipe; deduplicate the package README against the root README.

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make `GHOST_PACKAGE_DIR` honored by every command, not just `init` and `validate`; support `goose` in the `install.sh` curl installer; and drop detection of the pre-flat legacy checks directory entirely.

- [#216](https://github.com/block/ghost/pull/216) [`c95f58b`](https://github.com/block/ghost/commit/c95f58b91b36b4ac7421fd33d77b5f5ecadbcbb4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Refresh the entrance docs: accurate skeleton/body init descriptions, a documented `ghost export`, and plainer language on the welcome path.

- [#221](https://github.com/block/ghost/pull/221) [`ff5206e`](https://github.com/block/ghost/commit/ff5206e191909ee3de5eac5adaa13a6230961fc7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reconciles the vessel-light starter body: every token and primitive class is now demonstrated in a reference or removed, display type has one answer, and a closure check keeps the materials contract enforced.

## 0.21.0

### Minor Changes

- [#207](https://github.com/block/ghost/pull/207) [`27d5ebd`](https://github.com/block/ghost/commit/27d5ebdc795d1ed5a7468c823d48dc1c23f23936) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - The skill bundle gains the `adapting-a-starter` recipe: the seven-step transplant procedure for turning an installed starter — a body like vessel-light or the naked skeleton — into your own brand's fingerprint, plus guidance for consuming an unadapted starter honestly.

- [#207](https://github.com/block/ghost/pull/207) [`27d5ebd`](https://github.com/block/ghost/commit/27d5ebdc795d1ed5a7468c823d48dc1c23f23936) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost init` gains `--body vessel-light`: install a full inhabited fingerprint package — answered signature dials, a materials tree with tokens and embedded fonts, annotated reference compositions, and its own checks. Init template payloads now ship as packed files in dist, so bodies can carry binary materials.

- [#207](https://github.com/block/ghost/pull/207) [`27d5ebd`](https://github.com/block/ghost/commit/27d5ebdc795d1ed5a7468c823d48dc1c23f23936) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - The median floor gets one authored home: `anti-goal.median` rules become markdown headings with per-rule check references, so `ghost validate` warns on every flag orphaned by pruning. All init templates (`skeleton`, `minimal`, `composition`) now stamp the median node; `ghost checks init` copies the paired check from the packaged payload and skips it when the node is absent.

- [#207](https://github.com/block/ghost/pull/207) [`27d5ebd`](https://github.com/block/ghost/commit/27d5ebdc795d1ed5a7468c823d48dc1c23f23936) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost init` now scaffolds the skeleton starter: value-free grammar nodes, unanswered signature dials, and the `anti-goal.median` floor — replacing the Morrow Ledger demo content. `ghost checks init` scaffolds a live median-tells check alongside the example. `steering` remains as an alias for the new `skeleton` template.

### Patch Changes

- [#207](https://github.com/block/ghost/pull/207) [`27d5ebd`](https://github.com/block/ghost/commit/27d5ebdc795d1ed5a7468c823d48dc1c23f23936) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe the median as Ghost-stamped model truth and align Vessel's median check with heading anchors.

- [#207](https://github.com/block/ghost/pull/207) [`27d5ebd`](https://github.com/block/ghost/commit/27d5ebdc795d1ed5a7468c823d48dc1c23f23936) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost review` now resolves package-relative `materials/…` locators to their repo-relative form before matching diff paths, so packages living below the repo root offer their value checks correctly.

## 0.20.0

### Minor Changes

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `ghost.binding/v1` (`.ghost.bind.yml`) and the path road: a repo path
  resolves to the surface that owns it (directory-default binding or explicit
  declaration), and `ghost gather --path <file>` composes that surface's slice.
  The contract still carries no paths — bindings own all path matching.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost checks` and `ghost review` now route by catalog references and ground from the selected prose packet: grounding is the surface's gathered nodes by provenance (own / ancestor / edge), replacing the typed why/what (principles, contracts, patterns, exemplars) split — the why and what now live in each node's prose. `ghost checks` gains `--as <incarnation>` to filter grounding to one output form. Exemplar `path:` is dropped from grounding.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reduce the fingerprint collection to a flat catalog: remove the `checks`, `review`, and `migrate` commands, drop node `relates` edges and traversal, and reduce `gather` to emitting the menu the agent selects from.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove check surface routing: every check is now offered to the reviewer and the agent judges relevance, so the check `surface:` field, `selectChecksForSurfaces`, `RoutedCheck`, and `CheckRelevance` are gone. Checks bind to the fingerprint through an optional `source:` pointer (`node > Heading`) that `review` surfaces so a finding can cite the prose it enforces.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost init --template composition` scaffolds a composition-steering starter: the default files plus an invariants floor (`principle.composition`), a worked bound/open/refines pattern node, a glossary whose `pattern` and `principle` kinds carry the binding-depth convention, and an index that teaches the ladder — patterns when they match, principles as the floor when they don't, narrowing-only between them.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds opt-in wild consumption posture for glossary kinds and gather/pull/pulse observability.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Recompose `gather` on a corridor + hub-and-spoke model and fix a sibling-surface
  context leak. A surface's slice is now: a **spine** of full-body nodes from every
  file on the corridor (the package root down to the surface's own folder — folders
  are walls, so sibling folders never leak in), the **edges** reachable in one hop
  from any spine node's `relates` (so a broad rule authored once high in the tree —
  e.g. `relates: { to: arcade }` on `features/` — reaches every descendant), and a
  set of **spokes**: pointer entries (id + description) for the surface's own
  descendants and any edge hub's subtree, which the agent pulls on demand. The
  `CatalogSlice` JSON gains a `spokes` array; catalog nodes carry their file `folder`.
  Grounding for `checks`/`review` remains the full-body spine + edges.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add cross-package inheritance via `extends`. A package's `manifest.yml` can declare `extends: { <id>: <dir> }`, mapping another contract's identity to where it lives. Node refs then reference inherited context by identity, never path — `relates: [{ to: brand:core/trust }]` (the `<package-id>:<path>` form replaces the earlier npm-style `<pkg>#<id>` ref grammar). Inherited nodes load read-only and flow into gather and validate like local ones. `ghost validate` resolves cross-package refs and reports unresolved refs, packages not declared in `extends`, identity mismatches, and cross-package cycles. This delivers the shared-brand story: one brand contract extended by many products, without copy-paste or merge. One level of `extends` in v1 (no transitive); location is an explicit relative dir (identity-based discovery is a future upgrade that keeps refs unchanged).

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make `description` a first-class node field — the retrieval payload an agent matches a task against, the way a tool is selected by name + description. `ghost gather` with no argument now lists nodes by id + description (the catalog), built from the catalog rather than a separate surface menu. Node frontmatter is now passthrough: free-form descriptive keys (`audience`, `stage`, …) are allowed and ride along untouched. The surface composition-edge vocabulary (`composes`/`governed-by`) is removed — lateral composition lives on node `relates`.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Collapse the on-disk node model into the directory tree: the layout supplies the
  catalog. A node's id is its file path (`marketing/email.md` → `marketing/email`)
  and its parent is its containing directory; a surface is just a directory, and a
  directory's own prose lives in its `index.md` (the package-root `index.md` is
  the implicit `core` node). The `surfaces.yml` spine file and the `nodes/`
  directory are removed, along with the node frontmatter `id` and `under` fields —
  identity and containment now come from where a file sits, never from frontmatter
  or a declared spine. Node frontmatter carries descriptive properties only
  (`description`, `relates`, `incarnation`, plus passthrough keys); `relates` and
  cross-package `extends` refs are path ids (`core/trust`, `brand:core/trust`).
  `ghost init` scaffolds `manifest.yml` + a core `index.md`; `ghost migrate`
  writes a directory tree; any `*.md` outside the reserved `checks/` subtree lints
  as a node. Moving a node is a rename — `ghost validate` reports `relates` that no
  longer resolve.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Export `parseSourceRef` and `sliceNodeSection` from the core entrypoint: the shared parser for a check's `source:` reference grammar (`node-id > Heading`) and a helper to slice the referenced section out of a node body.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Bindings can reference an external contract: a `.ghost.bind.yml` `contract:` now
  accepts an npm package name (`@scope/brand`) in addition to `.` (in-repo),
  resolved from `node_modules`. `ghost verify` checks the external contract
  resolves and that each bound surface exists in it. External fingerprint loading
  for grounding remains a follow-up.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove the facet model — the catalog is now the only fingerprint model. The `intent.yml`/`inventory.yml`/`composition.yml` schemas, the `GhostFingerprintDocument`, the facet→node load-time projection, and the dormant facet slice/grounding are deleted; the loader assembles the package's prose nodes directly into the catalog. `ghost lint` and `ghost verify` are replaced by one `ghost validate` verb (artifact shape pass + catalog pass); `ghost emit` is removed. `ghost scan` now reports node/surface contribution instead of facet contribution. Legacy facet packages no longer load directly — `ghost validate`/load fail with guidance to run `ghost migrate`. Structured exemplar-path and evidence verification is dropped (evidence lives in node prose, per the prose-node model).

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add fingerprint grounding to `ghost checks`: for each touched surface, emit the
  _why_ (principles and experience contracts) and the _what good looks like_
  (patterns and exemplars with paths), drawn from that surface's slice and
  inherited from its ancestors. A flagged check can now cite the design intent it
  serves and point at an exemplar. Use `--no-grounding` for relevance only.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `ghost gather <surface>`: compose a surface's context slice (its own placed
  nodes, cascaded ancestors, and one-hop typed-edge contributions) with
  provenance, or return the surface menu when no surface is named.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost gather` now surfaces the glossary's kind purposes as a menu legend, in both markdown and JSON output, so the menu is self-sufficient selection context.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost gather` now composes its context packet from selected fingerprint catalog nodes and emits nodes-by-provenance prose (own / ancestor / edge), and gains `--as <incarnation>` to filter the packet to one output form (e.g. email, billboard, voice) while always keeping essence (untagged) nodes.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Return the node menu plus closest-id "did you mean" suggestions when `ghost
gather` is given an inexact query, instead of a separate ranked-candidate
  search — the agent re-picks by description from the same menu the no-argument
  form prints. `gather`, `checks`, and `review` all emit the stable
  `ERR_UNKNOWN_SURFACE` code with closest-id suggestions for a node or surface
  that is not in the package.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename the `gather` slice vocabulary to plain language. The JSON `slice.spokes`
  field is now `slice.pointers`, and the pointer `kind` `"edge-hub"` is now
  `"related"` with its origin in a `from` field (was `hub`). Docs and the skill
  bundle drop the spine/corridor/hub-and-spoke metaphors; `edge` provenance is
  unchanged.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `ghost.check/v1`: markdown + frontmatter checks (`name`, `description`,
  `severity`, optional `tools` / `turn-limit`, plus a Ghost `surface:` placement),
  parsed and linted but never executed by Ghost. Markdown files under a `checks/`
  directory lint as checks. This mirrors the established agent-check format so
  Ghost can route and ground checks without owning a check engine.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add local gather/pull event tracing and a pulse report for fingerprint tuning.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `goose` as a first-class `ghost skill install --agent` destination, installing to `~/.agents/skills` (Goose's canonical global skills directory) and auto-detecting Goose installs.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Ghost validates material locator liveness and inlines small local materials during pull.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `ghost migrate`: transform a legacy `.ghost/` package onto the directory-tree
  node model — derive surface directories from old `topology.scopes`, place
  single-scope nodes inside them, and report (never guess) any node it cannot place
  unambiguously.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost init` now scaffolds a node package (`manifest.yml` + a core `index.md` node) via a template registry (`--template <name>`, `default` for now) instead of emitting `intent.yml`/`inventory.yml`/`composition.yml`; the `--reference` flag is removed. `ghost migrate` now performs a one-way conversion of legacy/facet packages into a directory tree of nodes (the facet→node projection becomes the writer) and removes the old facet files. The authoring skill (`capture.md`, `SKILL.md`) teaches node authoring with intent/inventory/composition as authoring lenses rather than facet files.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove the path→surface binding (`ghost.binding/v1`, `.ghost.bind.yml`) and all nesting (fingerprint stacks, cross-package discovery): one contract per package, surfaces are the only locality. `checks` and `review` now take agent-stated `--surface <ids>` instead of resolving surfaces from a diff; `gather` takes only a surface or returns the menu. Removed `gather --path`, `checks --diff`, `lint --all`, `verify --all`, `scan --include-nested`, `emit --path`, `init --scope`, and `init --monorepo`. The agent names the touched surfaces; Ghost no longer infers intent from repo location.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add `ghost pull <id> [<id>…]`: emit selected nodes' prose bodies and record selections in the `.ghost/.events` events tape for fingerprint tuning.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds `ghost export` to package fingerprints as portable brand artifacts with material locator audits.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove `compare`, `drift`, `ack`, `track`, and `diverge` commands and the direct `fingerprint.md` machinery (parser, writer, semantic diff, decisions/dimensions, embeddings, perceptual prior). These rested on a quantified visual-design-system model (fixed dimensions + decision embeddings) that the catalog reframe abandoned; the concepts are parked for a later rethink (see docs/ideas/compare-drift-fleet-rethink.md). The `./compare` and `./drift` package subpaths and the root `compare`/`drift` exports are removed. `ghost lint` now validates `.ghost/` packages and node/surface/check artifacts only (direct `fingerprint.md` is no longer linted); a `*.md` node file lints as a `ghost.node/v1` node.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove cross-package `extends` and inherited nodes. A Ghost package is a single
  self-contained contract: its `.ghost/` directory tree is the whole fingerprint.
  The manifest no longer accepts `extends`, `relates` targets must be local path
  ids (the `<package>:<path>` colon ref is gone), and the catalog drops the
  `origin` / inherited-node distinction. Use `ghost --package <dir>` to address a
  package; there is no shared-brand inheritance in this version.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Removes the optional-capability subsystem and its per-capability manifest schema. Checks are now a core capability in a flat `.ghost/checks/` directory: scaffold with `ghost checks init` (or `ghost init --with checks`), and `ghost export --no-checks` replaces the old exclusion flag. `ghost validate` flags packages still using the old nested checks location.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove the `incarnation` node field and the `--as` gather/checks flag. Ghost
  fingerprints a single-medium product surface; the cross-medium projection axis
  (essence vs. incarnation, the portability dial) is dropped rather than shipped
  unused. Slices no longer carry an `incarnation` field and `ResolveCatalogSliceOptions`
  is removed.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove the absorbed and dead commands: `relay`, `stack`, `survey`, `diff`, and
  `describe`, along with the relay-only context modules and the `./relay` package
  export. Their intent now lives in the surface model — `gather` for context,
  `checks` for diff-routed governance, and bindings for path resolution. The skill
  bundle teaches the surface workflow.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove the `ghost scan` and `ghost signals` commands and the deterministic repo-inventory subsystem; the host agent does its own repo reconnaissance and `validate`/`gather` cover package inspection.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Collapse to one check format. Remove `ghost.validate/v1`, the `validate.yml`
  facet, the `ghost check` deterministic gate, and the `./govern` export. Ghost
  now has a single check format — markdown `ghost.check/v1`, routed by surface
  (`ghost checks`) and grounded by the fingerprint. `parseUnifiedDiff` moved to a
  neutral module; the `drift` stance ledger is unchanged.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Standardize the internal collection vocabulary on "catalog" to reflect the flat node set: public exports are `GhostCatalog`, `GhostCatalogNode`, `buildCatalogMenu`, `CatalogMenuEntry`, and `assembleCatalog`, and the loaded package exposes a `catalog` field.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename the public package from `@anarchitecture/ghost-fingerprint` to `@design-intelligence/ghost`. The `ghost` and `ghost-fingerprint` bins, all subpath exports (`/core`, `/fingerprint`, `/scan`, `/cli`), and the `.ghost/` package format are unchanged; only the npm name moves. Release tags and tarballs now use the `design-intelligence-ghost` prefix.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename the npm scope from `@decentralized-design` to `@design-intelligence`; the package is now `@design-intelligence/ghost` and release tarballs/tags use the `design-intelligence-ghost` prefix.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename the published package from `@design-intelligence/ghost` to
  `@design-intelligence/ghost`. Ghost is now a family of packages —
  `ghost-fingerprint` (the fingerprint and its CLI), `ghost-adherence` (the
  code-anchored adherence bridge), and `ghost-vessel` (the reference body) —
  and the package name now says which part it is. The `ghost` bin, all export
  subpaths (`/fingerprint`, `/scan`, `/core`, `/cli`), and the `.ghost/`
  on-disk format are unchanged; only the install name moves. Existing installs
  keep working from the old name until it is deprecated on npm with a pointer
  forward.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Collapse the separate adherence package into the fingerprint: nodes carry optional `materials` locators, checks become an opt-in capability of the fingerprint package, and `ghost review` assembles advisory diff packets from material-backed nodes and checks. The external dispatch to a second binary is removed.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Retire the `child-wins-by-id` fingerprint merge (Leak E): nested `.ghost/`
  packages now bind paths to the root contract's surfaces instead of merging their
  own facets in. A path resolves to the single root contract, used as-is — a child
  package can no longer silently override or disable an inherited rule or check.
  The `stack` / `check` / `review` outputs expose `contract` instead of `merged`,
  and drop the `provenance.merge` field.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rebuild `ghost review` on the surface rails: it now resolves the diff's touched
  surfaces (via bindings), selects the markdown checks governing them, and grounds
  each in the fingerprint slice — instead of emitting `validate.yml` and a
  path-selection context packet. The advisory-review JSON replaces
  `fingerprint` / `context_markdown` / `checks` / `stacks` with `touched_surfaces`,
  `routed_checks`, and `grounding`. `ghost check` remains the deterministic gate.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add a `ghost manifest --format json` command that emits a self-describing manifest of every command and flag, so a host agent can discover the CLI in one call instead of scraping `--help`. The terminal help, docs-site manifest, and this command all derive from one shared `buildCliManifest()` (also exported from `@design-intelligence/ghost/cli`).

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make the steering starter the default `ghost init` scaffold, move the old small scaffold to `--template minimal`, and mark starter steering content as demo guidance to replace.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds steering-ordered pulls, derived concreteness coverage, guard posture review routing, check probes, inspect-pointers for binary materials, and a worked steering starter.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds a steering-ready fingerprint template and skill guidance for authoring, briefing, and auditing agent-readable brand steering.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Replace topology/applies_to/surface_type/scope coordinates with a surface
  coordinate space and a single surface placement per node. Remove the
  `ghost.map/v1` (`map.md`) coordinate and routing system; checks now route by
  `applies_to.paths`.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add markdown checks (`ghost.check/v1`) in a package's `checks/` directory.
  `ghost checks --surface <ids>` grounds the named surfaces and offers every
  check; the host agent judges which apply. A check binds to the prose it enforces
  through an optional `source:` pointer (a node id with an optional `> Heading`),
  not by surface routing. Ghost selects, grounds, and emits checks; it never runs
  them.

### Patch Changes

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe fingerprint authoring as elicitation in the skill bundle and docs: remove the repo-scan-first auto-draft mode, rebuild the authoring scenarios around what the human says and shows, and point repo-derived reality at the adherence inventory.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add node prose stances and a scored drafting gate to the capture recipe so authoring agents hold draft nodes to anti-slop standards before human curation.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove redundant containment bookkeeping in favor of path-derived ids: parent and ancestor facts are derived from node paths, and the redundant parent/children maps are removed.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove the dormant context-selection machinery (`buildContextEntrypoint`, `buildSelectedContext`, and selection-reasons) that was inert since the coordinate removal and orphaned once `review` moved onto the surface rails. Internal cleanup; no public surface change.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Align docs and the skill bundle with the prose-bound check model: checks are no
  longer routed by surface, every check is offered and the agent judges which
  apply, and a check binds to prose via its optional `source:` pointer. Fix
  the `ghost scan` next-step hint and skill recipes that referenced a nonexistent
  `ghost check` command.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Refresh the README and docs site onto the current command set (drop the removed
  `lint`/`verify`/`relay`/`describe`/`survey`/`emit` commands).

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Drop two unused runtime dependencies (`jiti`, `tinyglobby`) — neither was imported anywhere in source. Ghost now ships three runtime deps (`cac`, `yaml`, `zod`), shrinking the install footprint by ~1.8 MB. Also fix the build to clear `tsconfig.tsbuildinfo` so `dist/` no longer retains deleted modules from incremental builds (the packed package drops from ~1.9 MB / 777 files to ~397 KB / 248 files).

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Print a one-time stderr notice when the local `.ghost/.events` tape is first created, so gather/pull logging is never a surprise.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make CLI exit codes consistent so an agent can branch on them: unexpected
  errors exit `1`, caller mistakes (bad flags, invalid environment, refused
  overwrites) exit `2` via a typed `UsageError`, and a missing package now exits
  `2` with a `ghost init` hint instead of leaking a raw filesystem error.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Lead fingerprint authoring with a concrete first move — capture the one surface whose review feedback keeps repeating — instead of a scenario-classification step.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add an inventory-lens authoring reference to the skill bundle.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rewrite the package README onto the flat-corpus model: plain-language framing, current CLI commands only, and removal of stale relation-era shapes (`relates`, surface directories, `checks/` at the fingerprint root, `ghost checks`/`ghost review`/`ghost migrate`).

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Retire the "three lenses" vocabulary: authoring docs now speak the same steering dimensions the CLI scores (stance, concreteness, patterns), and the inventory recipe becomes references/blocks.md with a neutral block kind in its examples.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add a thesis section to the README: agents changed the unit of design work, the work that compounds is architectural, and Ghost is the artifact those decisions live in.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clean em dashes out of the shipped skill bundle and package README prose,
  rewriting them as plain sentences, colons, or parentheticals.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make the glossary the authoritative source of kind semantics in the skill recipes, teach sample and counter-exemplar capture, add an `anti-goal` starter kind, and establish the `index` node as the always-pulled carrier of a fingerprint's non-negotiables and silence posture.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reorder the skill bundle to lead with the workflow loop and CLI verbs, moving the node-catalog model into a later "How It Works" section.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Teach the authoring lenses and `incarnation`/essence distinction from a shown node example instead of negative definitions ("not fields", "essence is untagged").

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe the package README and description around the fingerprint as a portable brand steering packet.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Update `ghost validate --help` to describe what validation actually checks today: manifest shape, node validity, material locators, check references, and glossary kind prefixes.

- [#205](https://github.com/block/ghost/pull/205) [`0f94bb9`](https://github.com/block/ghost/commit/0f94bb93746e9940952e2367127dcde58e7e54cd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - `ghost validate` now reports a node that fails its own schema instead of silently dropping it from the catalog.

## 0.18.1

### Patch Changes

- [#187](https://github.com/block/ghost/pull/187) [`5a2be98`](https://github.com/block/ghost/commit/5a2be98f4ee77e372fb2bf5e2bac6cfc0a854ceb) Thanks [@chailandau](https://github.com/chailandau)! - Honor `GHOST_PACKAGE_DIR` in the drift, ack, diverge, compare-history, and review-command emit paths so relocated fingerprint packages resolve consistently.

## 0.18.0

### Minor Changes

- [#184](https://github.com/block/ghost/pull/184) [`e79201c`](https://github.com/block/ghost/commit/e79201cceb8e4b1267c0a9fd32d4aea97d208603) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds Relay context JSON, structured Relay requests, and config-driven runtime selection for declared project context sources.

## 0.17.0

### Minor Changes

- [#181](https://github.com/block/ghost/pull/181) [`bc433fb`](https://github.com/block/ghost/commit/bc433fbac48edada4493a71f73816201f432a9b5) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Flatten Ghost packages so manifest, facets, and checks live directly in the package directory, remove config.yml behavior, and use GHOST_PACKAGE_DIR for host-wrapper package discovery.

## 0.16.0

### Minor Changes

- [#171](https://github.com/block/ghost/pull/171) [`b30c58f`](https://github.com/block/ghost/commit/b30c58ff53bfe6da911c8d625d6834ab506ff683) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename the portable fingerprint intent and validation artifacts to `intent.yml` and `validate.yml` with `ghost.validate/v1` refs.

- [#173](https://github.com/block/ghost/pull/173) [`a827e7c`](https://github.com/block/ghost/commit/a827e7c415d2e35b08b8ea3ae693125fcdd23b1d) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Compile Relay gather output into selected context grouped by stack, intent, composition, inventory, validation, and gaps.

- [#179](https://github.com/block/ghost/pull/179) [`5a2574e`](https://github.com/block/ghost/commit/5a2574e63bf0990b072456e8a0fef8fb0d62b4ae) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Change Relay gather output to the `ghost.relay.gather/v2` context hits contract.

- [#174](https://github.com/block/ghost/pull/174) [`9fa2779`](https://github.com/block/ghost/commit/9fa2779d51ad05dfef4d6cc79ca20ac08c99ab29) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Use selected context in advisory review packets.

- [#175](https://github.com/block/ghost/pull/175) [`1ff3437`](https://github.com/block/ghost/commit/1ff3437eb18d90b9007a5abbc57660467e52765e) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Expose Relay posture summaries in selected context.

- [#172](https://github.com/block/ghost/pull/172) [`7eac380`](https://github.com/block/ghost/commit/7eac380032c7c2a3f10f3096955c6e56f7df9388) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Report sparse fingerprint package contribution facets in `ghost scan` instead of all-or-nothing readiness.

### Patch Changes

- [#175](https://github.com/block/ghost/pull/175) [`f0ef52d`](https://github.com/block/ghost/commit/f0ef52d19363af8819dd6c702d582da3442055e7) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Polish selected-context handoff wording and review context formatting.

## 0.15.0

### Minor Changes

- [#168](https://github.com/block/ghost/pull/168) [`0a977f4`](https://github.com/block/ghost/commit/0a977f4ca344c141cd666e22995576b1c37c810e) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove optional memory and cache fingerprint package support, flatten checks to `fingerprint/checks.yml`, and rename `ghost inventory` to `ghost signals`.

### Patch Changes

- [#169](https://github.com/block/ghost/pull/169) [`dcc603a`](https://github.com/block/ghost/commit/dcc603abdf1b8345ead3fb9428ee52cd85f9fceb) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document how to author fingerprints as steering guidance for generation.

## 0.14.0

### Minor Changes

- [#165](https://github.com/block/ghost/pull/165) [`e540dad`](https://github.com/block/ghost/commit/e540dad3e51ef596cfe3c9e21d7fbfbf1fcbb137) Thanks [@chailandau](https://github.com/chailandau)! - Add an opt-in monorepo initializer that detects workspace child package roots and can create scoped Ghost packages.

## 0.13.0

### Minor Changes

- [#153](https://github.com/block/ghost/pull/153) [`012140f`](https://github.com/block/ghost/commit/012140fec70b1a6f8c2a7f82e1ad29c7de37a5b6) Thanks [@gnahCnayR](https://github.com/gnahCnayR)! - Add a Ghost-owned drift check command and explicit design-loop opt-in config.

## 0.12.1

### Patch Changes

- [#160](https://github.com/block/ghost/pull/160) [`a43c99a`](https://github.com/block/ghost/commit/a43c99af82d6434b9bdc366a6b7b7b5556687b00) Thanks [@chailandau](https://github.com/chailandau)! - Publish GitHub Release archives with runtime dependencies included for package-manager installs.

## 0.12.0

### Minor Changes

- [#157](https://github.com/block/ghost/pull/157) [`c07632e`](https://github.com/block/ghost/commit/c07632efadcdcafb8db17fc469c3752594c89899) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add a Task Contract to Relay gather output with preserve, inspect, avoid, and validate actions.

### Patch Changes

- [#157](https://github.com/block/ghost/pull/157) [`20b959f`](https://github.com/block/ghost/commit/20b959f6d2eb2bc067a632de8bad88700afcf849) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Improve Relay selected-ref shortlisting with relevance-aware ordering.

- [#157](https://github.com/block/ghost/pull/157) [`62494fd`](https://github.com/block/ghost/commit/62494fda4470ae3576e5749fd6ec0ad3ffa6bbb5) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Improve Relay brief readability and refresh Ghost's own fingerprint anchors.

## 0.11.2

### Patch Changes

- [#150](https://github.com/block/ghost/pull/150) [`95e045e`](https://github.com/block/ghost/commit/95e045e8b331ea69a013b6d5384cbb3656818d68) Thanks [@chailandau](https://github.com/chailandau)! - Autobump the Homebrew tap on npm publish so `brew install block/tap/ghost` tracks releases automatically.

## 0.11.1

### Patch Changes

- [#155](https://github.com/block/ghost/pull/155) [`3dc468d`](https://github.com/block/ghost/commit/3dc468d27faea3e0453784ead1a912edf7aa7a42) Thanks [@chailandau](https://github.com/chailandau)! - Publish npm releases through Changesets so the matching GitHub Release tarball is created.

## 0.11.0

### Minor Changes

- [#151](https://github.com/block/ghost/pull/151) [`a620c0b`](https://github.com/block/ghost/commit/a620c0b1040e644ded0614f8c6b8249ed1668edc) Thanks [@chailandau](https://github.com/chailandau)! - Adds `GHOST_MEMORY_DIR` as a host-wrapper default for Ghost fingerprint package storage.

## 0.10.0

### Minor Changes

- [#149](https://github.com/block/ghost/pull/149) [`cba98ad`](https://github.com/block/ghost/commit/cba98ad7f235ccd4f7d44fbcf98fae00c396e55b) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Bound advisory review packets with diff byte budgets and truncation metadata.

- [#149](https://github.com/block/ghost/pull/149) [`4e5dd47`](https://github.com/block/ghost/commit/4e5dd47a49e12ec7f69c2f6743907fa0366b2469) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make `ghost init` refuse to overwrite existing fingerprint files unless `--force` is passed.

### Patch Changes

- [#147](https://github.com/block/ghost/pull/147) [`5acba39`](https://github.com/block/ghost/commit/5acba397f9fbe3a325481035c1de51d12df2c9b9) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Update documentation to point generation-context workflows at `ghost relay gather`.

## 0.9.0

### Minor Changes

- [#144](https://github.com/block/ghost/pull/144) [`383d7b4`](https://github.com/block/ghost/commit/383d7b4b5976fe6645871740d3d8665abca9d1e3) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Restore scan to readiness and source-signal APIs, move fingerprint package operations to the fingerprint export, remove context-bundle emission, and add Relay gather for agent context.

## 0.8.0

### Minor Changes

- [#138](https://github.com/block/ghost/pull/138) [`dd0f10b`](https://github.com/block/ghost/commit/dd0f10b9bc8d2902dc93a8236b3fdc620d05b51c) Thanks [@daveh-beep](https://github.com/daveh-beep)! - Adds the voice recipe to the skill bundle and documents how voice and language map onto existing fingerprint layers without schema changes.

## 0.7.4

### Patch Changes

- [#141](https://github.com/block/ghost/pull/141) [`34c5726`](https://github.com/block/ghost/commit/34c57269f472c1cd8f9c7503036184e0c71bff19) Thanks [@chailandau](https://github.com/chailandau)! - Catch shorthand hex and named color literals in color-oriented design checks.

## 0.7.3

### Patch Changes

- [#139](https://github.com/block/ghost/pull/139) [`5e3d603`](https://github.com/block/ghost/commit/5e3d6032897cad5d39eb7149d11dc131f4878de3) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Emit compact, path-aware Ghost context entrypoints for generation and review.

## 0.7.2

### Patch Changes

- [#134](https://github.com/block/ghost/pull/134) [`075f0f3`](https://github.com/block/ghost/commit/075f0f3d3fb7cadbb8837dda5e8f232ce63e775b) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe public docs around product-surface composition and prune superseded planning notes.

## 0.7.1

### Patch Changes

- [#134](https://github.com/block/ghost/pull/134) [`075f0f3`](https://github.com/block/ghost/commit/075f0f3d3fb7cadbb8837dda5e8f232ce63e775b) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe public and agent-facing copy around product-surface composition.

## 0.7.0

### Minor Changes

- [#129](https://github.com/block/ghost/pull/129) [`d4ad85c`](https://github.com/block/ghost/commit/d4ad85c3970acf98148f1e4ed946729724760343) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add fingerprint-first public export aliases for fingerprint, governance, and comparison APIs.

### Patch Changes

- [#133](https://github.com/block/ghost/pull/133) [`d365819`](https://github.com/block/ghost/commit/d3658196e1693e69a0ec2d1f3dd9302dd666a1bf) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document auto-draft as an opt-in skill workflow for starter fingerprint authoring.

- [#131](https://github.com/block/ghost/pull/131) [`1ae59e3`](https://github.com/block/ghost/commit/1ae59e3e91d75bfd49a4cd49f2f24b799eb58942) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make the Ghost CLI bin executable after package builds.

- [#132](https://github.com/block/ghost/pull/132) [`584bb8b`](https://github.com/block/ghost/commit/584bb8bdf70260bc8574a63206ee60244f78ba07) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Read accepted decisions from the canonical rationale directory during single-package review.

## 0.6.0

### Minor Changes

- [#123](https://github.com/block/ghost/pull/123) [`d12634f`](https://github.com/block/ghost/commit/d12634f7d954dbaee8cf3846c3a80be66e1ece8d) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe public docs around Ghost's portable product-experience fingerprint.

### Patch Changes

- [#118](https://github.com/block/ghost/pull/118) [`5d452f6`](https://github.com/block/ghost/commit/5d452f6bad7474adb353d2ffe8bf149c6de36714) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document that Ghost is pre-1.0 beta software and may ship breaking changes during active development.

- [#128](https://github.com/block/ghost/pull/128) [`3b7390b`](https://github.com/block/ghost/commit/3b7390b2ce52441c24d94cf7404c30f1ef0a195e) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document collaborative human-agent fingerprint authoring scenarios in the installed Ghost skill and public docs.

- [#127](https://github.com/block/ghost/pull/127) [`523a244`](https://github.com/block/ghost/commit/523a24421efd87acd5eac17b20258eacad04b29b) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Document how npm package README updates are published.

- [#120](https://github.com/block/ghost/pull/120) [`8892b32`](https://github.com/block/ghost/commit/8892b321e1c79205964994c052ca203b748178e5) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Update Ghost install and help copy to describe only the current fingerprint package layout.

## 0.5.0

### Minor Changes

- [#117](https://github.com/block/ghost/pull/117) [`a730785`](https://github.com/block/ghost/commit/a7307859fa0357deea397f80eed6f1811f19a8b2) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make `.ghost/fingerprint/` the canonical portable fingerprint package with split prose, inventory, composition, enforcement, memory, and source files.

- [#114](https://github.com/block/ghost/pull/114) [`ae5855a`](https://github.com/block/ghost/commit/ae5855a8fda4b04ef7b1e946ce418918249bc5b9) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Break fingerprint/check schemas around prose, inventory, and composition, rename JSON fields from memory_dir/memory to fingerprint_dir/accepted_decisions, and rename decision lint exports to GhostDecisionLint\*.

### Patch Changes

- [#116](https://github.com/block/ghost/pull/116) [`a375602`](https://github.com/block/ghost/commit/a37560206e46f16f5e7b0228d883cd670b0d372a) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Simplify default command discovery while keeping the full command index available.

- [#114](https://github.com/block/ghost/pull/114) [`ae5855a`](https://github.com/block/ghost/commit/ae5855a8fda4b04ef7b1e946ce418918249bc5b9) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify Ghost as a product-experience world model and context bundles as upstream agent handoffs for UI generation.

## 0.4.0

### Minor Changes

- [#112](https://github.com/block/ghost/pull/112) [`19be5b5`](https://github.com/block/ghost/commit/19be5b500b6e5165bb8dc24b009f9074d31567cc) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make checked-in fingerprint.yml entries canonical, remove fingerprint entry lifecycle fields and proposals, add first-class exemplars, and emit context bundles as prose + inventory + exemplars generation packets.

### Patch Changes

- [`dc84d66`](https://github.com/block/ghost/commit/dc84d66a6dbb560b6b2bcff5b01bdac7aabfaa13) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify current docs for skill recipes and supported environment variables.

## 0.3.0

### Minor Changes

- [#106](https://github.com/block/ghost/pull/106) [`b56d58d`](https://github.com/block/ghost/commit/b56d58d222248d5225ba80741296749635bf0199) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Remove legacy direct fingerprint emit support and stale direct-markdown review prompt exports.

### Patch Changes

- [#108](https://github.com/block/ghost/pull/108) [`2ed0b3d`](https://github.com/block/ghost/commit/2ed0b3d4734b84a0807a81f99f57fa2a32b2ca8e) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify proposal and silent-memory guidance so agents threshold durable memory candidates and label provisional local reasoning.

## 0.2.1

### Patch Changes

- [#103](https://github.com/block/ghost/pull/103) [`1b9ad4a`](https://github.com/block/ghost/commit/1b9ad4a13f14e240b7f2dfd17b4546cbe632008d) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify Ghost review prompts stay grounded in fingerprint memory and active checks.

- [#104](https://github.com/block/ghost/pull/104) [`b900cf8`](https://github.com/block/ghost/commit/b900cf8d71aed7cc2a242e212b216d195512939e) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify that drift remediation should make the minimum sufficient repair instead of optimizing for the smallest diff.

## 0.2.0

### Minor Changes

- [#89](https://github.com/block/ghost/pull/89) [`4111610`](https://github.com/block/ghost/commit/4111610e22c705338ea0058565bd55ea896b44ba) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add typed fingerprint grounding for active ghost.checks/v1 checks.

- [#90](https://github.com/block/ghost/pull/90) [`06e56c5`](https://github.com/block/ghost/commit/06e56c5e3105eef5d0be5ab20db0349542494218) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Make fingerprint.yml the canonical package artifact for init, lint, scan, verify, and check grounding.

- [#94](https://github.com/block/ghost/pull/94) [`9f72a24`](https://github.com/block/ghost/commit/9f72a245212e874a2e6975af14c1fd70f25e5f34) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Emit package context bundles from fingerprint.yml memory by default.

- [#95](https://github.com/block/ghost/pull/95) [`71b3d79`](https://github.com/block/ghost/commit/71b3d79322bb96d76c7e19753c6020079bcbc070) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Emit review commands from fingerprint.yml memory by default.

- [#91](https://github.com/block/ghost/pull/91) [`2da2987`](https://github.com/block/ghost/commit/2da2987171da8d3e5c39c276327f00d3bd0220d4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Read fingerprint.yml as the canonical advisory review packet context.

- [#88](https://github.com/block/ghost/pull/88) [`1a736de`](https://github.com/block/ghost/commit/1a736de86e34f68e596e05905c45b142b4222980) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add core schema, types, and linting helpers for ghost.fingerprint/v1.

- [#92](https://github.com/block/ghost/pull/92) [`f41a4bf`](https://github.com/block/ghost/commit/f41a4bf7aa23106606b4b65a876d9f82841fe3d0) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Rename proposal kinds around missing memory, intentional divergence, experience gaps, and check candidates.

- [#100](https://github.com/block/ghost/pull/100) [`b1e8aa4`](https://github.com/block/ghost/commit/b1e8aa46eac4f8aff7ca101ba694acdc034cbffd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds adapter-neutral memory directory overrides and stabilizes Ghost check JSON for host wrappers.

- [#98](https://github.com/block/ghost/pull/98) [`9ee5941`](https://github.com/block/ghost/commit/9ee5941044a9665d67cfae4e904607529af8aa20) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Add data-only Ghost config scaffolding and reference-library context for Ghost UI consumers.

- [#97](https://github.com/block/ghost/pull/97) [`536c345`](https://github.com/block/ghost/commit/536c345144b8fafb543fea904de950fb8c5f6388) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Replace substrate-backed fingerprint memory with implementation vocabulary and durable check grounding.

- [#100](https://github.com/block/ghost/pull/100) [`b1e8aa4`](https://github.com/block/ghost/commit/b1e8aa46eac4f8aff7ca101ba694acdc034cbffd) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Adds nested Ghost memory stacks, scoped proposals, and diff-aware check/review routing.

### Patch Changes

- [#96](https://github.com/block/ghost/pull/96) [`8af8c81`](https://github.com/block/ghost/commit/8af8c81bb9c2028490be8e60d5505a9275f3cba6) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Clarify fingerprint.yml as canonical memory across docs and CLI help.

- [#93](https://github.com/block/ghost/pull/93) [`9afaa24`](https://github.com/block/ghost/commit/9afaa24b981365238f4527dcb5d6810f291fcfc6) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Update bundled Ghost skill recipes around fingerprint.yml-centered memory.

- [#99](https://github.com/block/ghost/pull/99) [`46a2eb9`](https://github.com/block/ghost/commit/46a2eb9cb6dfd71ee7e04f00759341d87a415677) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Validate fingerprint scopes, surface types, and check routing targets against canonical topology memory.

## 0.1.0

### Minor Changes

- [#78](https://github.com/block/ghost/pull/78) [`3dc8aeb`](https://github.com/block/ghost/commit/3dc8aeb21595a65bba8ced4c3373f9ca43925234) Thanks [@gnahCnayR](https://github.com/gnahCnayR)! - Add `--gate` mode to `ghost compare` that reads `.ghost-sync.json` and reports per-dimension verdicts (aligned / covered / reconverging / uncovered). Exits 0 when no uncovered drift, 1 when uncovered, 2 on hard error. Versioned JSON output via `--format json` (schema: `ghost.compare.gate/v1`). Composes over existing `compareFingerprints`, `readSyncManifest`, and `checkBounds` — no new orchestration.

- [#81](https://github.com/block/ghost/pull/81) [`e5163a6`](https://github.com/block/ghost/commit/e5163a6449cf44a93be0d69c6556d5560d16f73a) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Publish Ghost as one scoped package with the `ghost` CLI, unified scan and drift workflows, and one installed skill bundle.

- [#83](https://github.com/block/ghost/pull/83) [`0ba295a`](https://github.com/block/ghost/commit/0ba295a92516e0c65cdf685e5d9794297be8f2c4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Report scan evidence readiness so agents can distinguish product-observed, component-demo, substrate-only, and unobservable Ghost bundles.

### Patch Changes

- [#83](https://github.com/block/ghost/pull/83) [`0ba295a`](https://github.com/block/ghost/commit/0ba295a92516e0c65cdf685e5d9794297be8f2c4) Thanks [@nahiyankhan](https://github.com/nahiyankhan)! - Reframe the installed skill and docs around agent-led Ghost Fingerprint Capture.

## 0.0.0

Source version for the unified Ghost package. The first public publish is
expected to be cut by Changesets as `0.1.0`.
