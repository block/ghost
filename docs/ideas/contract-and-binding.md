---
status: exploring
---

# Contract and binding: the two durable artifacts

> **Mostly subsumed.** The contract/binding split this note proposes now falls
> out of `coordinate-space.md` for free: designing the coordinate space
> medium-agnostically produces the portable-contract-vs-repo-binding split
> without a separate decision. Keep this note for the *sort* (which piece goes
> where) and the artifact rationale; treat `coordinate-space.md` as the live
> design.

This note is subordinate to `fingerprint-first-architecture.md` (settled) and a
sibling to `ghost-layers.md` (exploring). It changes neither. The layers note
asks, of each file, *"which operation is this?"* and answers with five layers.
This note asks a different question along a different axis:

> Of the durable, checked-in thing Ghost produces, **which job is it doing —
> describing a portable surface language, or binding one repo to that
> language?**

It exists because of a confession, not a refactor: Ghost started as a repo-first
composition guard and was later stretched into a portable, possibly non-UI brand
contract. Both are good. The pain is that **one `.ghost/` artifact was asked to
be both at once.** This note names the seam between those two jobs so every
existing feature gets a home instead of getting cut.

## The one-line diagnosis

There are two durable artifacts hiding inside one folder.

- **The contract** is repo-agnostic. It is Square's surface language: brand
  intent, the surfaces it spans (email, web, product, pos, voice), the
  coordinate space those surfaces live in, and the patterns that make each feel
  intentional. It can be published, versioned, mounted over MCP, and consumed by
  many repos — or by no repo at all. It need not be about UI.
- **The binding** is repo-native. It is a thin statement that *this* working
  tree is an instance of *that* contract, and that these paths realize these
  surfaces. It is where path-first resolution, drift, and checks live, because
  those are inherently operations on a working tree.

Every recent contradiction is this seam showing through. "How does Relay work
from the repo root?" is the seam: the contract answers *from the prompt
coordinate*; the binding answers *from the path*. The question felt
irreconcilable because two artifacts were answering it at once.

## How this composes with the five layers

`ghost-layers.md` slices Ghost by **operation** (Description, Map, Selection,
Governance, Comparison). This note slices the same code by **durable artifact**.
They are orthogonal axes over the same files, and they agree:

| Layer (operation) | Contract (portable) | Binding (repo) |
| --- | --- | --- |
| 1 Description | Owns it. Brand intent/inventory/composition, scoped by surface. | References it. Adds none. |
| 2 Map | Owns it. The coordinate space *is* the contract's spine. | Maps paths → coordinates. |
| 3 Selection | Coordinate → contract slice (prompt-first). | Path → coordinate → slice (path-first). |
| 4 Governance | Declares checks against surfaces. | Runs checks/drift against a real diff. |
| 5 Comparison | The unit compared. | Not involved. |

The crucial agreement: **Leak A in the layers note (the map trapped inside the
description) is the contract's spine that the binding has been impersonating with
filesystem paths.** Extracting the map (their highest-leverage cut) and splitting
contract from binding (this note's cut) are the same surgery seen from two
angles. Do one and the other falls out.

## The shape, made concrete

Contract — portable, lives anywhere, knows nothing about git:

```text
square-brand/                  # an npm package, an MCP resource, a folder
  manifest.yml                 # ghost.contract/v1 (proposed)
  map.yml                      # Layer 2: dimensions + surfaces (the spine)
  core/                        # true everywhere: brand intent, tokens, voice
    intent.yml
    inventory.yml
    composition.yml
    validate.yml
  surfaces/
    email/lifecycle/
      intent.yml
      inventory.yml
      composition.yml
      validate.yml
    web/public/ ...
    product/dashboard/ ...
```

Binding — repo-native, tiny, points rather than redefines:

```text
apps/email-svc/.ghost.bind.yml
```

```yaml
schema: ghost.binding/v1
contract: square-brand          # path, npm name, or MCP id
surface: email/lifecycle        # a coordinate into the contract map
paths: [apps/email-svc/src]
```

A monorepo opened at the root has several bindings, each naming a different
surface of the same contract. Resolution unifies:

```text
prompt  → host extracts coordinate → contract slice         (no path needed)
path    → binding → coordinate     → same contract slice     (path is evidence)
```

Both roads arrive at one coordinate. The contract returns `core + that surface`
and nothing else. When the coordinate is unknown, the contract returns the
**surface menu**, never the whole tree — which is the structural cure for the
brand-mixing global fallback.

## The sort: every current piece gets a home

The point of the exercise. **Contract** = belongs to the portable artifact.
**Binding** = belongs to the repo instance. **Kill** = remove; it serves neither
cleanly and survives only as legacy or as a duplicate of something better placed.

| Piece | Home | Note |
| --- | --- | --- |
| `intent` / `inventory.building_blocks` / `composition` | **Contract** | Layer 1 core. Re-scoped from one flat bag to per-surface. Survives intact. |
| `inventory.topology` (scopes, surface_types) | **Contract** (as the map) | Leak A. Becomes `map.yml`, the contract spine — not a property of inventory. |
| `applies_to` smeared across nodes | **Contract** (resolved by map) | Leak A. A node's surface is its location in the tree, not a repeated tag. |
| `intent.situations` | **Contract** | Half-built coordinates (moment + surface_type). Folded into the map / surface nodes. |
| `validate.yml` checks (the *declaration*) | **Contract** | Surfaces declare their obligations. |
| `ghost check` / `review` / drift run against a diff | **Binding** | Inherently needs a working tree. Path-first. Stays repo-side. |
| `ack` / `track` / `diverge` (stance in `.ghost-sync.json`) | **Binding** | Stance is a repo-local relationship to a contract version. |
| Path → coordinate mapping (new `.ghost.bind.yml`) | **Binding** | The thin pointer. Replaces topology-as-path-matcher. |
| `relay gather` selection engine | **Both, unified** | One resolver: prompt→coordinate and path→binding→coordinate meet here. |
| `relay-config` `sources` / `request_resolvers` / stack resolvers | **Kill** | The *second* routing system. Collapses into map + binding. This is the core duplication. |
| `inventory.topology.scopes` as a runtime path-matcher | **Kill** | Path matching moves to the binding; the map keeps only the vocabulary. |
| `global fallback` (silent whole-graph dump) | **Kill** | Replaced by the explicit surface menu + "ask which surface." |
| `CAPS` truncation | **Kill** | Leak D. With a real map, the surface region is the budget. |
| nesting merge as ownership (`child-wins-by-id`) | **Binding** (as sugar) | Leak E. Demote to authoring convenience; ownership is git/CODEOWNERS. |
| `survey` / `ghost.survey/v1` | **Kill** | Legacy long tail. No home in either artifact. |
| `map.md` / `resources.yml` / `patterns.yml` / direct `fingerprint.md` | **Kill** | Migration museum. One canonical shape, no legacy formats. |
| `ghost diff` / `ghost describe` | **Kill** | Serve the dead direct-markdown path. |
| `signals` | **Binding** | Repo reconnaissance for authoring. Inherently working-tree-bound. |
| `compare` / `embedding/*` / `ghost-fleet` | **Contract** (consumer) | Layer 5. Compares contracts. Already clean; hold the line. |
| `ghost-ui` registry + MCP | **Contract** (delivery) | A way to ship a contract as a consumable resource. |

If this sort feels right, the relief is real: **nothing built was wasted.** Most
pieces move or get re-scoped; the Kill column is legacy and duplication, not
capability.

## What this buys (the relief, stated plainly)

- The portable brand bundle has no idea git exists. Shippable, reusable across
  many repos, works in the no-source-tree / MCP case. This is Job B, finally
  freed from Job A's working-tree assumptions.
- The binding is tiny — it points, it does not redefine. The monorepo-root case
  stops being a contradiction: many bindings, one contract, one coordinate space.
- "Non-UI composition" stops being scary scope creep. It is just a surface in the
  contract that no binding maps to UI paths. The contract is allowed to describe
  things no repo consumes.
- Net complexity goes **down**: one clarifying split (contract vs binding)
  replaces three colliding concepts (topology vs situations vs relay resolvers).

## The honest cost

- One new idea — `manifest` gains "contract vs binding," and the skill must teach
  *"are you authoring the brand, or binding a repo to it?"* That is one more
  concept than today, but it replaces three that fight.
- Authoring asks "is this brand-universal or surface-specific?" That cost is real
  — but it is the exact decision that prevents brand mixing, so it is a feature
  with a price, not pure overhead.
- The contract↔binding reference (by path, npm, or MCP id) needs a resolution
  contract. That is genuinely new surface area and the first thing to prototype.

## The forks worth arguing before any code

1. **Does the binding live in `.ghost.bind.yml`, or stays the contract embeddable
   in-repo for the common single-repo case?** Many repos *are* their own
   contract. The split must not tax the simple case: a lone repo should be able
   to inline its contract and skip the binding entirely.
2. **Partial cross-cuts.** Email+web-but-not-product guidance does not fit a
   strict surface tree. Medium-level intermediate surfaces absorb most of it;
   genuinely diagonal sharing forces the tree toward a DAG. Pressure-test before
   committing.
3. **Who owns the coordinate vocabulary** — `map.yml` as source of truth, or does
   it derive from the surface tree itself? Lean: the tree *is* the vocabulary;
   `map.yml` only adds aliases and descriptions. One source of truth (this is the
   layers note's Leak C resolved).
4. **Versioning the reference.** A binding pins a contract version; `ack`/`track`
   already model stance toward a moving reference. Does binding reuse that
   machinery or get its own?

## Not a plan

This note assigns the two artifacts and sorts the pieces. It schedules no moves,
changes no schema, and renames no command today. Concrete extraction — the
contract manifest, `map.yml`, the binding schema, the unified resolver — should
each be proposed in its own note and linked back here for the artifact rationale,
exactly as `ghost-layers.md` asks for its layer rationale.

Contracts to keep stable while sorting: `ghost.fingerprint/v1`,
`ghost.validate/v1`, `ghost.fingerprint-package/v1`, `ghost.relay-config/v1`,
`ghost.relay-request/v1`, `ghost.relay.gather/v2`, `ghost.check-report/v1`.

## Read-back

This note is successful if it converts a feeling into a list. You are not
serving too many purposes; you are serving **two** purposes with **one**
artifact. Name the two artifacts, sort each piece into Contract / Binding / Kill,
and the bundled mess becomes a portable contract plus a thin repo binding — with
nothing you built thrown away, only sorted.
