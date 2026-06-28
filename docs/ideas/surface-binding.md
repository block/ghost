---
status: exploring
---

# Surface binding: connecting a repo to the contract

This note is subordinate to `fingerprint-first-architecture.md` (settled),
designed by `coordinate-space.md`, and the second concrete cut after
`surface-schema.md`. It settles the one fork that note left open: how a real
working tree declares that it realizes a surface, and where. It builds on the
`ghost.binding/v1` vocabulary first sketched in `contract-and-binding.md`.

The schema note defined the **portable contract** (`surfaces.yml`,
repo-agnostic, no paths). This note defines the other half of the contract/
binding split: the **binding** — the thin repo-native statement that *this*
working tree is an instance of that contract, and these paths realize these
surfaces.

## What stays constant

- **The contract carries no paths.** `surfaces.yml` stays repo-agnostic. This is
  the hard rule from `surface-schema.md` and it is non-negotiable here: the
  binding exists precisely so the contract never has to know git exists.
- **The no-repo cases need no binding.** Outcomes 3 & 4 (customer brand
  generation, portable brand package) resolve directly from a prompt to a
  surface. The binding is **purely additive** for the repo cases (outcomes 1 &
  2). A lone prompt against a contract never touches a binding.
- **Resolution is BYOA.** Ghost resolves path → surface deterministically, no
  LLM. The host agent still does any natural-language matching.

## What the binding is for

Two outcomes need a working tree connected to the contract:

1. **In-repo work (outcome 1).** "I'm editing `apps/checkout/page.tsx` → which
   surface's slice do I get before I build?" needs **path → surface**.
2. **PR gate (outcome 2).** "This diff touches these files → which surfaces'
   checks run?" needs the same resolution over a **diff**.

Both are the same primitive: **given a path, resolve the surface that owns it,
then compose that surface's slice** (its subtree + cascaded ancestors + typed
edges, per `coordinate-space.md`). The binding is the only thing that turns a
filesystem path into a surface id. Nothing else in the model knows about paths.

This is also where three layers plug in: Selection (Layer 3) and Governance
(Layer 4) both consume path → surface; the contract/binding seam
(`contract-and-binding.md`) becomes concrete here; and it is the final home for
demoting nesting-as-ownership (Leak E).

## The shape: directory by default, declaration as escape hatch

`surface-schema.md` left the sub-fork as nested-package vs. explicit declaration
vs. both. **Decision: both, with directory location as the default binding and an
explicit declaration as the escape hatch.**

### Directory location is the default binding

The common case needs zero new ceremony. A scoped `.ghost/` package placed in a
directory **binds the surfaces it declares to that directory's subtree**. This
reuses the nested-package resolution Ghost already has — root-to-leaf discovery
along a path — but reframes what nesting *means*: not a data merge, a **binding**.

```text
.ghost/                      # root contract: surfaces.yml defines the tree
apps/checkout/.ghost/        # binds checkout surfaces to apps/checkout/**
apps/checkout/page.tsx       # resolves to the checkout surface by location
```

For a path, Ghost walks from root to leaf, finds the nearest binding, and that
binding names the surface. Location *is* ownership. No `paths:` field is needed
in the common case because the directory already says where the binding applies.

### Explicit declaration when ownership does not match the tree

Sometimes the surface a path realizes is not where the directory tree would put
it — a flat repo, a surface realized across scattered paths, a monorepo whose
layout predates the surface model. For that, an explicit binding file:

```text
apps/email-svc/.ghost.bind.yml
```

```yaml
schema: ghost.binding/v1
contract: .                  # path, npm name, or resource id of the contract
bindings:
  - surface: email-lifecycle # a surface id in the contract
    paths: [apps/email-svc/src]
  - surface: email-marketing
    paths: [apps/email-svc/campaigns]
```

The explicit form names contract + surface + paths directly. It is the escape
hatch, not the default: most repos never write one. `paths:` lives **here, on
the binding**, never on the surface — this is exactly where the deleted
`topology.scopes[].paths` actually belonged.

### Precedence

When both exist, **the nearest binding along the path wins**, and an explicit
`.ghost.bind.yml` at a given level takes precedence over directory-implied
binding at that level. Precedence is positional and deterministic; there is no
merge of competing bindings, no priority weights. (Holds the `reset.md`
no-cascade-fragility line.)

## Resolution

One resolver serves both roads, meeting at a surface id:

```text
prompt  → host matches the described menu → surface id ─┐
                                                        ├─→ compose slice
path    → nearest binding → surface id ─────────────────┘
diff    → each changed path → binding → surface id(s) → union of slices/checks
```

- **Prompt road (no repo):** unchanged from `coordinate-space.md`. No binding
  involved. The contract resolves a surface from the described menu.
- **Path road (repo):** walk root→leaf, nearest binding names the surface,
  compose its slice. Path is *evidence that resolves to a coordinate*, not a
  coordinate itself.
- **Diff road (PR gate):** resolve each changed path to its surface, take the
  union, run those surfaces' checks against the diff. A path with no binding
  resolves to the root contract's `core` (the diff still gets brand-wide checks).

When a path resolves to **no surface and there is no root contract**, the result
is the explicit "which surface?" menu, never a whole-tree dump — the same
brand-mixing cure as the prompt road.

## Nesting is binding, not data-merge (Leak E, resolved)

`coordinate-space.md` put `child-wins-by-id` union merge on the delete list.
This note is its final home. Nested `.ghost/` packages stop being a data-merge
mechanism (root facets union-merged into child facets by id) and become a
**binding mechanism**: a nested package binds surfaces to its subtree. Ownership
is positional and git/CODEOWNERS-shaped, not a silent field-level override.

Consequences, all of them improvements:

- A root edit can no longer silently break a leaf's resolved slice through merge.
- A child can no longer silently disable an inherited critical check via
  `status: disabled` in a merge (`purposes.md` leak #3) — checks live on
  surfaces in the contract, and the binding only points.
- "Don't nest just because files differ" (`purposes.md` leak #5) becomes
  structural: you nest to bind a different surface, not to override data.

## What this buys

- The monorepo-root case stops being a contradiction: many bindings, one
  contract, one coordinate space. Opening the repo at root and editing a
  checkout file resolves to the checkout surface via its binding.
- The portable contract is genuinely shippable: no binding, no git assumptions,
  works over npm or a resource id for outcomes 3 & 4.
- Path matching has exactly one home (the binding), so the contract, selection,
  and governance never re-grow their own path matchers (the Leak B/C instinct).

## Open forks (decide before code)

1. **Contract reference resolution.** `contract: .` (in-repo, the common case)
   is trivial. Cross-repo references (npm name, resource id) need a resolution
   contract and version pinning. Recommendation: ship in-repo `contract: .`
   first; defer external references to their own note. `ack` / `track` already
   model stance toward a moving reference and may supply the versioning
   machinery.
2. **Implicit vs. explicit root contract for `core` fallback.** When a path has
   no binding, does it resolve to root `core`, or to "no surface → menu"?
   Recommendation: if a root contract exists, unbound paths resolve to `core`
   (brand-wide checks still apply); if none exists, return the menu.
3. **Does a scoped `.ghost/` redeclare surfaces, or only bind existing ones?**
   Recommendation: a binding references surface ids that exist in the root
   contract; it does not define new surfaces. One source of truth for the tree
   (the schema note's flat-id, single-`parent` discipline extends here).

## What stays stable

Hold these contracts while binding is explored: `ghost.fingerprint/v1`,
`ghost.validate/v1`, `ghost.fingerprint-package/v1`, `ghost.check-report/v1`,
and the proposed `ghost.surfaces/v1`. `ghost.binding/v1` is new and additive;
absent any binding, the contract behaves exactly as the no-repo case.

## A caution worth recording

This is the **least proof-validated layer** of the redesign. The live
composition proof case resolves context from a prompt with no repo binding at
all — it exercises the contract and the prompt road, not the path or diff roads.
So the binding is designed from outcomes 1 & 2 reasoning, not yet from a running
proof. Treat its first implementation as a hypothesis to validate against a real
in-repo case, and prefer the smallest version (directory-default binding,
in-repo `contract: .`, defer external references) until a working tree exercises
it.

## Not a plan

This note settles the binding shape (directory-default, explicit escape hatch),
the resolution roads, and the home for Leak E. It writes no Zod, renames no
command, and moves no field today. Implementation — the `ghost.binding/v1`
loader, path→surface resolution, diff→surfaces for the PR gate — is the next
cut, and it sits behind the surface-schema implementation it depends on.

## Read-back

This note succeeds if:

- The contract still carries no paths; the binding owns all path matching.
- The no-repo cases need no binding, and the repo cases add one without changing
  the contract.
- Path, prompt, and diff all resolve to a surface id through one resolver.
- Nesting is reframed from data-merge to binding, retiring Leak E.
- The honest caution is recorded: this layer is real but the least validated by
  the live proof case, so it ships smallest-first.
