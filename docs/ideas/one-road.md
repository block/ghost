---
status: exploring
---

# One road: remove the binding and nesting, drive everything from the prompt

A decision, not a hedge. Ghost keeps the one thing only it can do — deterministically
compose the curated slice for a *named surface* — and drops everything that tried
to infer intent or context from repo location: the **binding** (`ghost.binding/v1`,
path→surface, Phase 7a + Cut D) **and nesting itself** (stacks, cross-package
discovery, `--all`/`--scope`/`--path`). One contract per package; surfaces are
the only locality.

## The case

- The agent never has only a path. It has the prompt **and** its own whole-repo
  analysis — strictly more than a path glob. Binding had Ghost doing, badly, a
  job the agent already does better (deciding what a change is about).
- The binding is the last "second source of truth that can drift from reality" —
  the same pattern the reset killed in the merge (Leak E), the map, and relay.
- The determinism the binding protected — routing with no LLM — has had nothing
  to protect since Cut C: checks are markdown, always agent-evaluated. There is
  no no-agent path left to guard.
- Removing it **unifies all four outcomes into one flow**: prompt (+ the agent's
  repo/diff analysis) → match the surface menu → `gather <surface>` → slice. The
  repo case becomes a special case of the brand case; the contract is portable by
  default, not "the clean half of a split."

## The single thing we give up (named honestly)

Deterministic, prompt-free path→surface routing: "this file changed → these
checks always run, with no agent in the loop." That belongs to eslint/CI, not Ghost,
and post-Cut-C Ghost no longer offers it anyway. The *capability* people wanted
from it — run the right checks on a diff — survives: the agent names the touched
surfaces (it already analyzed the diff) and asks Ghost for those.

External-contract use (Cut D) also survives via the **desire-survives test**: use
`gather --package node_modules/@scope/brand/.ghost <surface>` to compose from an
installed brand package. The agent points at the package; no binding-side
resolution needed. Mechanism dies, capability stays.

## Nesting goes too (the correction)

An earlier draft of this note kept "nested-package discovery." That was wrong.
Nesting only ever meant two things: **merge** (federated child fingerprints,
killed in 7b Cut 1) and **binding** (nested `.ghost/` = path→surface, killed
here). Once both are gone, **nesting has no meaning left** — keeping discovery,
stacks, and `--all` is scaffolding for a concept that no longer exists.

**Decision: one contract per package.** A repo's `.ghost/` is the contract.
A monorepo with genuinely independent products runs Ghost per-package (or points
`--package` at each) — those are parallel standalone contracts, not a nested
hierarchy. No stacks, no merge, no chain, no cross-package discovery.

So this cut also removes the **stack machinery** and the nesting commands:

- `loadFingerprintStackForPath`, `groupFingerprintStacksForPaths`,
  `discoverFingerprintStack`, `buildFingerprintStack`,
  `fingerprintStackToPackageContext`, `GhostFingerprintStack*` types,
  `lintAllFingerprintStacks`, `verifyAllFingerprintStacks`,
  `discoverGhostPackages`, `initScopedFingerprintPackage`.
- `lint --all`, `verify --all`, `scan --include-nested`, `emit --path`,
  `init --scope`.

## What stays untouched (the engine)

Surfaces, the containment tree, cascade, typed edges, `gather <surface>`, the
surface menu, `ghost.check/v1`, `selectChecksForSurfaces`, grounding,
`resolveSurfaceSlice`. The core model does not move.

**Load-bearing helpers in `fingerprint-stack.ts` survive** (they are not nesting):
`resolveGitRoot`, `normalizeGhostDir`, `resolveGhostDirDefault`,
`GHOST_PACKAGE_DIR_ENV`, `fingerprintPackageDisplayPath`. Move them to a neutral
home (e.g. `scan/package-paths.ts`) before deleting the rest of the file.

**`--package` and `GHOST_PACKAGE_DIR` survive** — "use exactly this `.ghost/`
dir" is direct addressing, not nesting. This is how a monorepo targets one of its
independent contracts.

## The new command shapes

- **`gather <surface>`** — unchanged. **Drop `gather --path`.**
- **`gather`** (no surface) — unchanged: returns the menu for the agent to match.
- **`checks --surface <ids>`** — replaces `checks --diff`. The agent passes the
  surfaces it already determined the change touches (comma-separated, or repeated
  flag). Ghost routes + grounds for those surfaces. **Drop diff parsing +
  path→surface from `checks`.**
- **`review --surface <ids>`** (+ `--diff` kept *only* as the patch to embed in
  the packet, not to resolve surfaces from). The agent supplies the surfaces; the
  diff is included verbatim for the reviewer. **Drop path→surface from `review`.**

Rationale: a diff no longer *implies* surfaces (that was the binding's job).
The agent — which read the diff — states the surfaces. Ghost stops guessing.

## Surgical removal plan (sequenced, each step green)

### Step 1 — reshape the consumers off path-resolution (before deleting it)

Do this first so nothing imports the binding when we delete it.

- **`gather-command.ts`**: remove `--path`, `discoverBindingsForPath`,
  `resolvePathToSurface`. `gather` takes a surface arg or returns the menu. Done.
- **`checks-command.ts`**: replace `--diff` + diff→surface resolution with
  `--surface <ids>`. Parse the id list, `selectChecksForSurfaces` + `groundSurface`
  over them. Keep `--package`, `--format`, `--no-grounding`. Drop
  `parseUnifiedDiff`, `discoverBindingsForPath`, `resolvePathToSurface`.
- **`review-packet.ts`**: `buildReviewPacket` takes `surfaces: string[]` instead
  of resolving from the diff; keep the diff purely as embedded text. Drop the
  binding imports + `parseUnifiedDiff`-for-resolution (diff text still included).
- **`cli.ts`**: update `review` to accept `--surface`; keep `--diff` as embed-only.

### Step 2 — delete the binding verify + file-kind dispatch

- **`scan/verify-package.ts`**: delete `verifyBindingContract` /
  `readContractSurfaceIds` and the `resolveContractDir` import. Verify goes back
  to fingerprint evidence/exemplars only.
- **`scan/file-kind.ts`**: remove the `binding` kind, `.ghost.bind.yml`
  detection, the `ghost.binding/v1` schema match, the dispatch branch, and
  `lintBindingFile`.

### Step 3 — delete the binding modules

- `ghost-core/binding/` (schema, lint, types, resolve, contract-ref, index).
- `scan/binding-discovery.ts`, `scan/contract-resolver.ts`.
- Remove all binding/contract re-exports from `ghost-core/index.ts` and
  `scan/index.ts`.

### Step 4 — tear down nesting (the correction)

- **Rescue the load-bearing helpers first:** move `resolveGitRoot`,
  `normalizeGhostDir`, `resolveGhostDirDefault`, `GHOST_PACKAGE_DIR_ENV`,
  `fingerprintPackageDisplayPath` out of `fingerprint-stack.ts` into a neutral
  `scan/package-paths.ts`; repoint importers (`fingerprint-commands`,
  `verify-package`, `init-command`, `scan-emit-command`, `scan/index`).
- **Delete the rest of `fingerprint-stack.ts`:** stack types, `discoverGhostPackages`,
  `discoverFingerprintStack`, `loadFingerprintStackForPath`,
  `groupFingerprintStacksForPaths`, `buildFingerprintStack`,
  `loadFingerprintStackLayer`, `fingerprintStackToPackageContext`,
  `lintAllFingerprintStacks`, `verifyAllFingerprintStacks`,
  `initScopedFingerprintPackage`. (The file likely disappears entirely once
  helpers are rescued.)
- **`fingerprint-commands.ts`:** remove `lint --all`, `verify --all`,
  `scan --include-nested`, `nestedPackageStatus`. `lint`/`verify`/`scan` operate
  on the single resolved package (or `--package`).
- **`scan-emit-command.ts`:** remove `--path` and the stack path; `emit` runs on
  the resolved package or `--package`.
- **`init-command.ts` / `monorepo-init-command.ts`:** remove `init --scope` and
  the monorepo child-scaffolding that created nested packages.
- Remove stack re-exports from `scan/index.ts`.

### Step 5 — docs, skill, migrate note, changeset

- **`migrate-legacy.ts`**: the `paths-not-migrated` note currently says
  "path→surface binding is not part of placement." Reword to "paths are not part
  of the surface model" (drop the binding reference).
- **Skill bundle / `schema.md`**: remove `.ghost.bind.yml` and binding/contract
  guidance; teach the single flow (prompt → menu → `gather <surface>`; agent
  names touched surfaces for `checks`/`review`; external contract via
  `gather --package`).
- Mark `surface-binding.md`, `phase-7-plan.md`/`7a`, `polish-cut-d-plan.md`
  superseded with a one-line header pointing here.
- `major` changeset: removes `ghost.binding/v1`, `.ghost.bind.yml`,
  `gather --path`, `checks --diff`, `lint --all`, `verify --all`,
  `scan --include-nested`, `emit --path`, `init --scope`, and nested-package
  stacks. `checks`/`review` take `--surface`; one contract per package.

## Tests

- Delete `binding-resolve`, `binding-schema`, `contract-ref`, `contract-resolver`
  test files.
- `cli.test.ts`: replace `gather --path` and `checks --diff` cases with
  `checks --surface`; rework the `review ... mixed diff` case to pass `--surface`;
  drop the external-contract verify case (or move it to a `gather --package` case).
- `surfaces-*`, `check-route`, `surfaces-ground` are unaffected (they never used
  the binding).
- Full `pnpm test` + `pnpm check` green.

## Scope boundary (what this does NOT do)

- Does **not** touch the surface model, cascade, gather slice, checks routing
  logic, or grounding — only how *which surfaces* is determined (agent-stated, not
  path-resolved).
- Does **not** remove `--package` / `GHOST_PACKAGE_DIR` — direct addressing of a
  single package survives; it is how a monorepo targets one of its independent
  contracts.
- Does **not** add NLP to Ghost — the agent still does all matching; Ghost gains
  no understanding, it just stops guessing from paths.

## Read-back

One road succeeds if: the binding (`ghost.binding/v1`, path→surface, contract
resolution) **and** all nesting (stacks, merge-era discovery, `--all`,
`--include-nested`, `--path`, `--scope`) are gone; one contract per package;
`gather` takes only a surface or returns the menu; `checks` and `review` take
agent-stated `--surface` ids (diff is embed-only); external contracts and
monorepo sub-contracts are reached via `--package`; the load-bearing path
helpers survive in a neutral home; the surface engine is untouched; and Ghost no
longer infers intent from repo location anywhere.
