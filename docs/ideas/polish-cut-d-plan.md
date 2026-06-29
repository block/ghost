---
status: exploring
---

# Polish Cut D plan: external contract references in bindings

The last deferred cut. Today a `.ghost.bind.yml` only supports `contract: .`
(the in-repo root contract); lint hard-rejects anything else. Cut D lets a
binding reference an **external contract** — a published brand package — so a
repo can bind its local paths to surfaces defined by `@scope/brand` in
`node_modules`.

## Scope (from the roadmap, held tight)

- **npm-name references only.** `contract: @scope/brand` or `contract: brand`.
  Arbitrary resource-id resolvers (needing host config) are deferred.
- **No new version machinery.** `ack` / `track` already model stance toward a
  moving reference; do not reinvent pinning here.
- The cut is **resolution + validation**, not a new runtime.

## The finding that bounds it

The `contract:` field is currently *informational*: lint only checks it is `.`,
and discovery (`readExplicitBinding`) takes the binding's surface ids on faith —
it never cross-checks them against the contract's `surfaces.yml`. And
`gather`/`checks`/`review` operate on the *local* package; composing an external
contract's content already works via `gather --package node_modules/<name>/.ghost`.

So Cut D's real, bounded value is: **resolve the referenced contract and validate
that the bound surfaces exist in it.** Nothing else needs to change.

## What it builds

1. **Schema/lint** accept a contract reference: `.` (in-repo) or an npm package
   name (`@scope/name` or `name`). Replace the hard `binding-contract-unsupported`
   error with: `.` is always fine; an npm-name is fine *syntactically*;
   anything else (a path, a URL, a resource id) is still rejected for now.
2. **A contract resolver** (`scan/contract-resolver.ts`): given a reference and a
   starting dir, return the contract's `.ghost/` directory.
   - `.` → the in-repo contract (root `.ghost/`, the existing behavior).
   - npm name → the nearest `node_modules/<name>/.ghost/` walking up from the
     binding's directory. Returns `null` when unresolved.
3. **Verify integration**: a binding with an external `contract:` is validated —
   the referenced package resolves and each bound `surface` exists in that
   contract's `surfaces.yml`. Unresolved package or unknown surface → a verify
   error (`binding-contract-unresolved` / `binding-surface-unknown`).

## What it does NOT do

- **No external fingerprint loading in `gather`/`checks`/`review`.** They stay
  local; `--package` already reaches an external package's `.ghost/`. Following a
  binding to auto-load an external contract's *content* for grounding is a larger
  follow-up, explicitly deferred.
- **No resource-id resolvers, no version pinning, no network fetch.** npm
  resolution is filesystem-only (`node_modules`); installing the package is the
  host's job.
- The in-repo `contract: .` path is unchanged.

## Steps

1. Add an npm-name matcher to the binding schema/lint; relax the contract check
   to accept `.` or a valid npm name, reject the rest.
2. Write `resolveContractDir(reference, fromDir, repoRoot)` in `scan/` — `.` and
   npm-name resolution, filesystem-only, `null` on miss.
3. In `verify-package` (or a binding verifier), for each `.ghost.bind.yml` with a
   non-`.` contract: resolve it, read its `surfaces.yml`, and assert each bound
   surface exists; emit verify errors otherwise.
4. Tests: npm-name lint accept/reject; resolver finds `node_modules/<name>/.ghost`
   and returns null when absent; verify flags an unknown surface / unresolved
   package; `contract: .` still works unchanged.
5. Update the binding docstring + skill/schema reference to document external
   references. Changeset `minor` (additive).

## Read-back

Cut D succeeds if a `.ghost.bind.yml` can declare `contract: @scope/brand`,
Ghost resolves it from `node_modules` and validates the bound surfaces exist in
that contract, the in-repo `.` path is unchanged, and external fingerprint
loading for grounding is explicitly left as a follow-up.
