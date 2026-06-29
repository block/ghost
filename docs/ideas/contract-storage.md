---
status: exploring
---

# Contract storage: facet-first vs. surface-first

An open exploration, not a decision. The question underneath "do we need one
giant yml": **how should the contract organize itself on disk?** We never chose
this — the facet files (`intent.yml`, `inventory.yml`, `composition.yml`) predate
surfaces, and `surface:` was bolted on. This note examines the real fork and
traces every domino, so the choice gets made on purpose.

## The principle this rests on

`purposes.md`: *one model, many projections.* We applied it to reads (consumers)
but never to **storage**. Storage is a projection too. The model is "surfaces +
placed nodes + edges"; the on-disk layout is one serialization of it. The
**loader** is the boundary — change the layout, change only the loader, and the
in-memory `GhostFingerprintDocument` stays identical.

This is the load-bearing architectural fact (verified in code):

```
files on disk ──(loader: assembleFingerprint)──▶ GhostFingerprintDocument ──▶ everything
```

Every consumer — `resolveSurfaceSlice`, `gather`, `selectChecksForSurfaces`,
`groundSurface`, lint, verify, compare — operates on the **assembled in-memory
object**. None of them read files. So storage layout is a loader concern and
nothing else. That is what makes this change tractable rather than sweeping.

## The two layouts

### Facet-first (today, inherited)

```
.ghost/
  manifest.yml
  intent.yml        # ALL principles/contracts/situations, each tagged surface:
  inventory.yml     # ALL exemplars/building-blocks, each tagged surface:
  composition.yml   # ALL patterns, each tagged surface:
  surfaces.yml      # the tree + edges
  checks/*.md
```

- ✅ Cross-cutting coherence at a glance ("is our voice consistent across the
  product?" — read one file).
- ❌ A surface is scattered across three files; "everything about checkout" is a
  filter, not a place. Editing one surface touches shared files → merge
  conflicts, fuzzy ownership.
- ❌ `surface:` is a tag repeated on every node — the awkwardness already noticed.

### Surface-first (the alternative)

```
.ghost/
  manifest.yml
  surfaces.yml             # the tree + edges (the spine stays)
  core/                    # cross-cutting: voice, trust, accessibility
    intent.yml
    inventory.yml
    composition.yml
  email/
    intent.yml             # everything email, colocated
    ...
  checkout/
    intent.yml             # independently ownable / reviewable
    ...
  checks/*.md
```

- ✅ A surface is a **place**: "everything about checkout" is a directory.
- ✅ Independent edit / review / ownership per surface (CODEOWNERS-friendly).
- ✅ **`surface:` disappears** — a principle in `checkout/intent.yml` is on
  checkout because of where it lives *in the contract*. Placement becomes
  implicit-by-location, but location *inside the portable artifact*, never the
  repo. (The ergonomic win of folders with none of the binding's repo-coupling.)
- ❌ Cross-cutting coherence now spans directories (mitigated by `core/` holding
  the cross-cutting facets).

## Why surface-first fits the model better

The realization that drove this: **surfaces are concepts, and a concept is
coherent.** "Email" is one idea; its intent, material, and patterns belong
together. Facet-first shreds each concept across three files for the sake of a
cross-cutting view that is the *rarer* need. Surface-first colocates the concept
and puts the cross-cutting stuff at `core/` — which is exactly the cascade shape
(`core` is the universal ancestor). **The storage mirrors the model.**

## The domino effect (traced through the code)

The boundary holds beautifully — the blast radius is the loader and the things
that *write/scaffold* files, not the things that *read the model*.

### Changes (the loader + writers)

1. **`scan/fingerprint-package-layers.ts` (the loader)** — the real work.
   Today: read three files, `assembleFingerprint`. New: read `surfaces.yml`,
   then for each surface dir (`core/`, `email/`, …) read its facet files,
   stamp each node's `surface` from the dir name, and merge into one
   `GhostFingerprintDocument`. **`assembleFingerprint` becomes a fold over
   surface dirs instead of three fixed files.** This is the keystone change.
2. **`scan/fingerprint-package.ts`** — `FingerprintPackagePaths` stops being
   fixed file paths; becomes "the package dir + a way to enumerate surface
   dirs." `init` scaffolds `core/` instead of flat facet files.
3. **`init` / templates** — scaffold `surfaces.yml` + `core/{intent,inventory,
   composition}.yml` instead of flat facets.
4. **`migrate`** — gains a second job: not just legacy→surface placement, but
   facet-first→surface-first re-filing (read tagged nodes, write them into their
   surface's dir). Natural fit; the migrator already groups by surface.
5. **`lint` / `file-kind`** — a facet file's *kind* no longer implies its
   surface; lint reads the dir context. The `surface:` field on nodes is
   removed from the schema (location replaces it).
6. **`scan` status / contribution** — "which facets contribute" becomes "which
   surfaces contribute," reported per-surface dir.

### Does NOT change (the model + all read consumers)

- **`GhostFingerprintDocument`** in-memory shape — identical. The whole point.
- **`resolveSurfaceSlice`, `ancestorChain`, `buildSurfaceMenu`,
  `groundSurface`, `selectChecksForSurfaces`** — untouched. They consume the
  assembled object; they never knew how it was stored.
- **`gather`, `checks`, `review`** — untouched.
- **`surfaces.yml`** — unchanged. The tree/edge spine stays a flat id-ref list
  (the right call from the flat-vs-nested discussion: one referencing mechanism
  for both containment and composition).
- **compare / drift / fleet** — read the assembled doc; untouched.

So: **one hard change (the loader), a handful of writer/scaffold updates, zero
change to the model or any read path.** The `assembleFingerprint` seam is what
contains it.

## The schema consequence worth naming

Surface-first **removes `surface:` from the node schemas** — it's now implied by
file location. That is a real schema change (and a `major`), but it's a
*simplification*: nodes get smaller, the "unplaced = core" rule becomes
"lives in core/ = core," and the placement-lint warning ("add a surface:")
disappears because placement is structural.

The one subtlety: a node that genuinely applies to several surfaces. Facet-first
"solved" this by... not (you picked one surface or core). Surface-first: it lives
in `core/` (cascades to all) or, for the rare diagonal, the surface that owns it
plus a typed `edge`. Same answer as today, no worse.

## Interaction with one-road

These compose cleanly and should land in order: **one-road first** (remove the
binding/nesting — it touches commands and `fingerprint-stack.ts`), **then
storage** (reorganize the contract's internals). One-road removes repo-coupling;
storage improves the artifact's own filing. They do not overlap — different
files, different concerns — but doing storage first would mean re-touching the
loader twice.

## Open questions (genuinely undecided)

1. **Surface-first vs. facet-first** — the core fork. Surface-first fits the
   "concepts are coherent" model; facet-first keeps cross-cutting coherence.
   Leading candidate: **surface-first with `core/` as the cross-cutting home.**
2. **One facet file per surface dir, or one merged file per surface?**
   `checkout/intent.yml` + `checkout/composition.yml`, vs. a single
   `checkout.yml` with intent/inventory/composition sections. The latter is
   fewer files; the former matches today's facet split. (A single file per
   surface may be the real "small shape" — one file = one concept.)
3. **Does `surfaces.yml` stay separate, or does the tree become implied by the
   directory layout?** Directory nesting *could* imply `parent` — but that
   reintroduces the flat-vs-nested trap (structure as a second encoding of
   hierarchy, fighting edges). Recommendation: **keep `surfaces.yml` flat and
   explicit**; dirs are just where nodes live, not where the tree is declared.
4. **Empty/sparse surfaces** — a surface in `surfaces.yml` with no dir yet.
   Fine (it contributes nothing); but lint should probably note it.

## Read-back

This note is right if it establishes that "one giant yml" was never the
question; the real, unexamined fork is **facet-first vs. surface-first storage**;
the loader (`assembleFingerprint`) is the only structural boundary that moves;
the model and every read consumer are untouched; surface-first makes `surface:`
implicit-by-location (inside the contract, not the repo) and mirrors the
cascade; and it composes with one-road by landing after it.
