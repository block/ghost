---
status: exploring
---

# Implementation plan: the surface-model cutover

This note sequences the implementation of the surface model designed across
`reset.md`, `coordinate-space.md`, `surface-schema.md`, and `surface-binding.md`.
It is subordinate to `fingerprint-first-architecture.md` (settled). It schedules
work; it does not redesign anything.

## Stance: hard cutover, breaking change

Decided: **one hard breaking change, no parallel old/new model.** `topology`,
`applies_to`, `surface_type`/`scope` on nodes, `ghost.map/v1`, and
nesting-as-merge are removed, not deprecated-alongside. Rationale:

- Ghost is pre-1.0 (`0.18.0`). One major bump is the cheapest moment to break.
- Carrying both models during a migration window is its own sprawl — the exact
  thing the reset exists to end. A clean break is less total work than a bridge.
- One published package (`@anarchitecture/ghost`); a single `major` changeset
  covers the whole cutover.

The cost this accepts: any existing `.ghost/` package with `topology` /
`applies_to` / `surface_type` / `scope` must migrate. We provide a one-shot
migration command (Phase 6) and accept that old fingerprints fail `lint` loudly
until migrated. No silent compatibility shim.

## Blast radius (measured)

- ~38 `src` files touch `topology` / `applies_to` / `surface_type` / `scope`.
- ~16 `src` files touch `ghost.map/v1` (the entire `ghost-core/map/` module
  plus its consumers in `scan`, `checks`, `core`).
- ~20 test files reference dead fields or the dead `relay` / `survey` surface.
- 19 CLI commands; several (`relay`, `survey`, `diff`, `describe`, `stack`) are
  on the delete list from earlier notes and should be reconfirmed against the
  new model rather than ported.

This is large but bounded, and concentrated: `fingerprint/{schema,types,lint}`,
`scan/fingerprint-stack`, `context/*`, and `checks/*` carry most of it.

## Sequencing principle

Each phase is one PR-sized cut, lands green (`pnpm check` + `pnpm test`), and is
committed before the next starts. Both gates run automatically on the
pre-commit hook (`lefthook.yml`), so a phase cannot be committed red — there is
no per-phase choice about which suite to run, and no `--no-verify` split to keep
clean. No two phases open at once — the same discipline that kept the design
notes clean. The order is **dependency-driven**:
schema before lint before loader before consumers before resolver before
binding. Nothing downstream is touched until its upstream lands.

## Phases

### Phase 0 — freeze and baseline

- Tag the current green state on the branch (pre-cutover reference).
- Snapshot the current public-export surface (`test/public-exports.test.ts`) so
  the breaking diff is explicit and reviewable.
- Write the `major` changeset stub now, filled in as phases land.

No behavior change. This phase makes the break auditable.

### Phase 1 — `ghost.surfaces/v1` schema module

- New module `ghost-core/surfaces/` (`schema.ts`, `types.ts`, `index.ts`),
  mirroring the `fingerprint/` module layout.
- Zod for `surfaces.yml`: `surfaces[]` with `id` (flat slug, no dots), optional
  `description`, optional single `parent`, optional `edges[]` (`kind` from the
  fixed Ghost-owned set, `to` an existing id). `edge_kinds` is a code constant,
  not package data.
- Export from `@anarchitecture/ghost/core`.
- Tests: schema accepts the valid shape, rejects dotted ids, parent arrays,
  unknown edge kinds.

Depends on: nothing. Pure addition. Lands without touching existing behavior.

### Phase 2 — surfaces lint + tree/graph validation

- `ghost-core/surfaces/lint.ts`: parent references exist, no cycles (tree),
  single parent, edge `to` references exist, edge `kind` is known, near-miss id
  warnings, `core` reserved as implicit root.
- Composition edges may form a graph (cross-links allowed); only `parent` is
  tree-constrained.
- Wire into `ghost lint` for `surfaces.yml`.
- Tests: each lint rule, valid graph passes, cyclic parent fails.

Depends on: Phase 1.

### Phase 3 — placement on description nodes

- Remove `applies_to` from principles / patterns / experience_contracts; remove
  `surface_type` / `scope` from exemplars and situations; remove
  `topology` from `inventory`.
- Add a single optional `surface: <id>` placement key to each placeable node.
- Lint: placement references an existing surface; un-placed node **warns and
  teaches** (never silent `core`); near-miss id warns.
- Update `fingerprint/{schema,types,lint}.ts` and `checks/schema.ts` (drop
  `check.applies_to`, add `check.surface`).
- Tests: placement validation; the warn-not-error behavior; removed fields now
  rejected by `.strict()`.

Depends on: Phase 1–2. **This is the breaking core** — the schema no longer
accepts the old coordinate fields.

### Phase 4 — delete `ghost.map/v1`

- Remove `ghost-core/map/` entirely and its consumers' map dependencies in
  `scan/` (`fingerprint-package`, `inventory`, `file-kind`, `lint-map`,
  `scan-status`, `fingerprint-stack`), `checks/` (`routing`, `lint`, `types`),
  and `core/` (`check`, `scope-resolver`).
- Replace map-derived scope resolution with surface resolution from Phase 1–3.
- Remove `map.md` handling and `MAP_FILENAME`.
- Tests: delete `map-scopes.test.ts` and `scope-resolver.test.ts` map paths;
  retarget any still-valid assertions to surfaces.

Depends on: Phase 3 (surfaces must own scope resolution before map is removed).

### Phase 5 — slice resolver + menu emitter, as the new gather command (Layer 3, prompt road)

- Resolver: given a surface id, compose its slice = own placed nodes + cascaded
  ancestor nodes + typed-edge contributions. Deterministic, no LLM.
- Menu emitter: surfaces + descriptions for the host agent to match against.
- Ambiguity returns the menu, never a whole-tree dump.
- **Ship this as the new context-gathering command** (working name `gather` /
  `select`): relay's *desire* done right (see "Command fate"). Do not build it
  on the old relay-config / request-resolution plumbing.
- Replace the old `context/entrypoint.ts` `CAPS` truncation and
  `globalFallbackRefs` with surface-scoped composition.
- Tests: cascade correctness, edge contribution, menu shape, ambiguity → menu.

Depends on: Phase 3–4. This is where selection stops improvising around a
missing map.

### Phase 6 — migration command

- `ghost migrate` (or `ghost surfaces init --from-legacy`): one-shot transform
  of an existing `.ghost/` — derive `surfaces.yml` from old `topology.scopes`,
  rewrite node `applies_to` / `surface_type` / `scope` into `surface:`
  placement. Best-effort, prints what it could not place for human review.
- Migrate this repo's own dogfood `.ghost/` with it (the worked example in
  `surface-schema.md`), and commit the migrated package.
- Tests: a legacy fixture migrates to a valid `surfaces.yml` + placed nodes.

Depends on: Phase 1–5. The migrator needs the target shape to exist.

### Phase 7 — `ghost.binding/v1` (path road + diff road)

- New `ghost-core/binding/` schema + loader for `.ghost.bind.yml`.
- Reframe nested-package resolution from data-merge to binding: nearest binding
  along a path names the surface; explicit `.ghost.bind.yml` overrides
  directory-implied binding at its level.
- Wire path → surface and diff → surfaces into `check` / `review` (Layer 4) and
  the path road of selection (Layer 3).
- Retire `child-wins-by-id` merge (`scan/fingerprint-stack.ts`) — Leak E.
- Ship smallest first: directory-default binding + in-repo `contract: .`; defer
  external contract references.
- Tests: path resolves to nearest binding; diff → union of surfaces; no-binding
  path → `core` when a root contract exists.

Depends on: Phase 1–6. Lands last because it is the **least proof-validated**
layer (`surface-binding.md` caution) and depends on everything above.

### Phase 8 — command + skill + docs reconciliation

- Delete the absorbed/dead commands per "Command fate" — `relay`, `stack`,
  `survey`, `diff`, `describe` — and remove the relay-config loader,
  request-resolution, and request-stack modules in `context/`. This is execution,
  not decision.
- Update the skill bundle references to teach placement + surfaces (the
  `voice.md` fix was a preview of this).
- Regenerate the CLI manifest (`pnpm dump:cli-help`).
- Fill in the `major` changeset.
- Tests: `cli.test.ts`, `public-exports.test.ts` updated to the new surface.

Depends on: Phase 1–7.

## What lands when (the cutover line)

Phases 1–2 are **additive and safe** — they can land without breaking anything.
**Phase 3 is the breaking line**: once node coordinate fields are removed, old
fingerprints fail lint. Everything from Phase 3 on is part of the single major
release. Plan to land 1–2 first to de-risk, then 3–8 as the breaking sequence.

## Command fate: the desire-survives test (settled)

Decided by one rule: **a command's desire survives if the new model serves it; the
command's implementation survives only if it already is that.** Relay the desire
("give an agent the right narrow context at the right time, traceably") is the
whole point of the coordinate space and is realized correctly by the Phase 5
resolver. Relay the implementation (`relay-config`, `request_resolvers`,
`sources`, `ghost.relay-request/v1`, the selector-routing facet) is the second
routing system on the delete list. So the *desire* lives on under a truer name;
the *mechanism* dies.

Applying the test to the whole delete list:

| Command | Desire survives as | Implementation |
| --- | --- | --- |
| `relay` | Phase 5 slice resolver + menu emitter | **deleted** (absorbed into a new `gather` / `select` command) |
| `stack` | path → surface (Phase 7 binding) | **deleted** (absorbed) |
| `survey` | nothing in the new model | **deleted** |
| `diff` | the dead direct-markdown path | **deleted** |
| `describe` | the dead direct-markdown path | **deleted** |

Consequence for sequencing: **Phase 5 ships the new context-gathering command**
(working name `gather` or `select`) as relay's desire done right, and **Phase 8
deletes `relay` / `stack` / `survey` / `diff` / `describe` as execution, not
decision.** The relay config loader, request-resolution, and request-stack
modules in `context/` are removed with `relay`.

## Open decisions for planning

1. **One mega-PR vs. phased merges to the branch.** Recommendation: phased
   commits on `reset-coordinate-space` (as we have been), squash-reviewed as one
   major release. Keeps each cut reviewable without shipping a half-cut model.
2. **`ghost migrate` permanence.** Is the migrator a permanent command or a
   one-release transitional tool removed in the next major? Recommendation:
   transitional, documented as such.
3. **New command name.** `gather` vs. `select` vs. keeping `gather` as a verb on
   a renamed noun. Cosmetic; decide at Phase 5.

## Not the work itself

This note sequences the cutover. It writes no code. Each phase becomes its own
commit (or small PR) on the branch, lands green, and is checked off here as it
completes. Implementation starts at Phase 0.

## Read-back

This plan succeeds if:

- The cutover is one breaking major, not a compatibility bridge.
- Phases are dependency-ordered: schema → lint → placement → map-delete →
  resolver → migrate → binding → commands.
- The breaking line (Phase 3) is explicit, with safe additive work (1–2) landed
  first.
- Every phase lands green and committed before the next begins.
- The least-validated layer (binding) lands last.
