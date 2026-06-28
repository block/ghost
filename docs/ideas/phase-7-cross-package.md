---
status: exploring
---

# Phase 7: cross-package resolution

Seventh build phase. Make `<package>#<id>` refs *resolve* — the last real
feature. This is what lets a shared brand contract be consumed across sibling
packages and repos (Scenarios B and E): a product's `core` node `relates` to
`@acme/brand#core-trust`, and gather/validate follow that link into the
installed brand package. Read `context-graph.md` (the scenarios) and phases 2–6
first.

## What already exists (parsed, not resolved)

- The **ref grammar** accepts `<package>#<id>` and `@scope/pkg#<id>`
  (`NodeRefSchema`). So cross-package refs already *validate* in node files.
- `lintGraph` and `resolveGraphSlice` **explicitly skip** `#` refs today
  ("later phase"). Nothing resolves them.
- There is **no `consumes`** in the manifest and no second-package loading.

Phase 7 turns those skips into real resolution.

## The model: a package `extends` others, by identity

`extends` is cross-package inheritance — the same idea as the within-package
cascade (`under` inherits downward), now across a file boundary. (Note: `extends`
has precedent — the legacy direct `fingerprint.md` had an `extends:` field; this
reclaims it for the graph model.)

The load-bearing principle: **reference by identity, never by path.** A package
already declares its identity in `manifest.yml` (`id:`). Cross-package refs carry
that identity; *where* the package lives on disk is resolved in one isolated,
swappable layer — never baked into a ref. This mirrors how the rest of Ghost
already separates "what" from "where" (gather names a node id; the binding death
stopped inferring intent from path). An alias-to-a-dir map would re-couple refs
to the file tree — exactly the trap one-road removed for surfaces.

There is no separate "consumed dependency" concept: inherited nodes are just
*nodes you inherited*, in the same bucket as cascade. This is what dissolves the
namespacing / direct-addressing / cross-package-parent questions below.

1. **A package declares what it extends — one `extends` map, key = identity,
   value = where (for now):**

   ```yaml
   # the brand contract's manifest
   id: brand

   # the product contract's manifest
   id: acme-checkout
   extends:
     brand: ../brand/.ghost   # key `brand` is the identity refs use; value is location
   ```

   No double bookkeeping: the key is the public identity (`brand:core-trust`
   references the *key*, never the path); the value is just where to find it
   today. The discovery upgrade makes the value optional (omit → Ghost finds the
   package whose manifest `id` matches the key); an explicit value stays a valid
   override. So refs and the model never change when discovery lands.

2. **Refs carry identity, with `:` as the qualifier** (Ghost's own lineage —
   old typed refs were `intent.principle:foo`, `validate.check:bar`). A ref is
   `<package-id>:<node-id>`; a bare `<node-id>` is local:

   ```yaml
   under: brand:core              # inherit from the `brand` contract's core node
   relates:
     - to: brand:core-trust
       as: reinforces
   ```

   `brand:core-trust` = "the `core-trust` node in the contract that declares
   `id: brand`" — stable across moves, repos, and how it's installed. No path in
   any ref.

3. **Location resolution is the `extends` map value** — the path lives in exactly
   one place, never in a ref. v1: explicit `id → dir`. Next: discovery makes the
   value optional (match by manifest `id`); upgrading the resolver changes **no
   ref**.

4. **The loader resolves extended packages** into the graph as **read-only
   inherited nodes**, keyed by their full ref id (`brand:core-trust`), tagged
   `origin: "inherited"`. `under`/`relates` `<id>:<node>` refs resolve against
   them.

Cost to name: package `id`s become the public coordinate, so they must be
**stable and meaningful** (`brand`, not `acme-checkout-9f3`) — the same
discipline node ids already follow.

## Resolution shape (the loader change)

`assembleGraph` (or a wrapper) gains inherited-package input:

```
loadFingerprintPackage(paths):
  manifest, surfaces, own nodes  → as today
  for each id in manifest.extends:
     resolve id → dir (resolution map in v1; discovery later)
     load that package (one level — no transitive extends in v1)
     verify the loaded package's manifest id matches `id`
     key its node ids as `id:<node>`, mark origin: "inherited"
     union into the graph (inherited nodes never override local)
  lintGraph: now `<id>:<node>` refs must resolve to a loaded inherited node
```

Key rules:
- **Inherited nodes are read-only context** — they appear in gather slices
  (cascade/relates reach them) but a package never *edits* an inherited node.
- **One level of extends in v1** (no transitive `extends` of extends) — keep it
  bounded; revisit if a real need appears.
- **Identity mismatch** (resolved package's `id` ≠ the extended id) is an error.
- **Cycles across packages** are an error (validate catches them).
- **Unresolvable id** → validate/load fails with clear guidance
  ("`brand` is extended but no package with that id could be resolved").

## What resolves where

- **validate** (graph pass): `<id>:<node>` refs must now resolve to a loaded
  inherited node; an unresolved ref is an error (was skipped). A ref whose
  package id isn't in `extends` is a distinct, clearer error.
- **gather**: the slice traverses into inherited nodes via `under`/`relates`
  (inherit from an extended brand `core`, or pull a related brand node).
  Provenance is marked so the agent knows it's inherited from an extended
  contract.
- **checks**: routing is unchanged (checks are local), but grounding slices may
  now include inherited nodes — fine, same slice resolver.

## Files

- `ghost-core/package-manifest.ts`: add optional `extends` map
  (`Record<id, dir>`; value optional once discovery lands) to the schema.
- `ghost-core/node/schema.ts`: change `NodeRefSchema` from `<pkg>#<id>` /
  `@scope/pkg#id` to `<package-id>:<node-id>` (both slugs); a bare slug stays
  local.
- `scan/` resolver: an `id → dir` resolution step (map for v1), isolated so
  discovery can replace it later without touching refs.
- `scan/fingerprint-package.ts` / `-layers.ts`: resolve each extended id, load
  the package, verify its manifest id matches, pass inherited nodes to
  `assembleGraph`.
- `ghost-core/graph/assemble.ts`: accept `inheritedNodes` (ids already the full
  `id:<node>` ref, `origin: "inherited"`), union them in (local wins, inherited
  never overrides).
- `ghost-core/graph/lint.ts`: `<id>:<node>` refs resolve against inherited
  nodes; add `unresolved-cross-package` / `package-not-extended` /
  `extends-identity-mismatch` rules; cross-package cycle detection.
- `ghost-core/graph/slice.ts`: stop skipping qualified refs; resolve + tag
  inherited provenance.
- `GhostGraphNode.origin`: add `"inherited"`.

## Tests

- An extending package with `extends: { brand: ... }` (resolved to a sibling package
  whose manifest is `id: brand`) and a `relates: brand:core-trust` resolves;
  gather includes the inherited node tagged inherited.
- `under: brand:core` inherits brand context into the extender.
- Unresolved ref (package id not in `extends`) → validate error.
- Unresolvable extended id (no package found) → load/validate error w/ guidance.
- Identity mismatch (resolved package id ≠ extended id) → validate error.
- Cross-package cycle → validate error.
- A package with no `extends` behaves exactly as today (no regression).

## Explicitly NOT in Phase 7

- Transitive extends (extends-of-extends) — one level in v1.
- Editing inherited nodes / write-back — inherited is read-only.
- The `surface`→`node` symbol rename.
- Versioning/compat checks between extender and extended (a future concern;
  Git/npm version the extended package).

## Settled (the identity framing dissolved the earlier open questions)

Reference by identity (`<id>:<node>`), resolve location separately, inherited
nodes are *just nodes* — so the prior questions fold away:

1. **Refs are path-free** (`brand:core-trust`); the one path (if any) lives in
   the v1 resolution map, replaceable by discovery without touching refs.
2. **Inherited node ids:** the full ref *is* the id (`brand:core-trust`) — no
   separate namespace bucket.
3. **Direct cross-package `gather`:** a ref resolves the same whether local or
   `id:node`, so `gather` accepts either; no special addressing mode. (The menu
   may still default to local surfaces.)
4. **Cross-package `under`/parent:** a node's `under` may point at `id:node` — it
   inherits from a node in the extended contract. One tree; some edges cross a
   package boundary. Scenario E's product-tree-under-brand-`core` is the natural
   case.

## Read-back

Phase 7 succeeds when a package can declare `extends`, `<package>#<id>` refs in
`under`/`relates` resolve to read-only inherited nodes loaded from the extended
package, gather traverses into them with inherited provenance, validate catches
unresolved/un-extended/cyclic cross-package refs, and packages with no `extends`
are unaffected. This delivers the Scenario-B/E shared-brand story: one brand
contract, extended by many products, without copy-paste or merge.
