---
status: exploring
---

# The coordinate space (Layer 2), designed clean

This note is subordinate to `fingerprint-first-architecture.md` (settled) and is
the first cut named by `reset.md`. It supersedes the Layer 2 framing in
`ghost-layers.md` and the "map" framing in `contract-and-binding.md`: both
correctly located the leak; neither had the design. This note has the design.

It was written **clean-room**. The shape below was derived from Ghost's purpose,
the five layers, and a working session about real outcomes — deliberately
*without* reading the two existing coordinate implementations (`ghost.map/v1`
and `inventory.topology`). Those are read only in the final section, to confirm
what gets deleted. Nothing here is back-formed from what exists.

## What stays constant

This redesign touches **one layer only**. Held fixed:

- **Layer 1 (Description):** intent / inventory / composition. Their *content*
  does not change. (Their coordinate *annotations* do — see below.)
- **Layer 4 (Governance):** checks, drift, `ack` / `track` / `diverge`.
- **Layer 5 (Comparison):** compare, fleet, embeddings.

The four-facet artifact and the projection rule from `purposes.md` are
untouched. This is a greenfield of the coordinate space, not the project.

## The one-line definition

> A **surface** is an author-named group, with an optional description, that
> holds a slice of the fingerprint and may contain sub-surfaces.

That is the entire concept. Ghost ships the *mechanism* for authored groups. It
does **not** ship a taxonomy. `email`, `flyer`, `menu`, `settings`, `checkout`,
`modules/billing` are all author data, never Ghost vocabulary. The system has no
opinion about what surfaces exist — only that each is named, optionally
described, nestable, and the home of some rules and context.

This is the point-1 fix from the reset session: the coordinate space is not
back-formed from tags the description happened to need. It is its own thing —
a vocabulary of *groups*, owned by authors, that the description is *placed
into*.

## The four outcomes this must serve

The design is validated against four real outcomes, not abstractions:

1. **In-repo UI work (existing or new).** A builder prompts an agent to work on
   UI. Ghost supplies the right slice before the agent builds. Result beats no
   Ghost.
2. **Non-visual builder → PR gate.** A builder ships a feature; Ghost runs PR
   checks as a governance gate against the right slice.
3. **Customer brand generation (no repo).** A customer prompts a product to make
   a flyer / menu / sticker / email for their brand. Ghost — already compiled
   for that brand — drives the generation context and self-heals. *No path, no
   diff, no repo exists.*
4. **Portable brand package.** Internal teams maintain one brand fingerprint
   centrally; it cascades to all systems; everyone edits one package so nothing
   diverges.

The unifying observation: **all four ask the same question — "the right slice,
at the right time."** They differ only in *how the slice is named*: a path, a
prompt, an explicit surface, a package id. That difference is **medium, not
model.** Outcome 3 is the forcing function: it has the least medium (no path, no
repo), so the coordinate space must be designed from *it* and treat path / diff
/ prompt as conveniences layered on top. No medium is privileged.

## The topology: strict tree + cascade + rare explicit edges

Accepted in the design session. Stated precisely, in graph terms:

**Containment is a strict tree.** Every node — every principle, exemplar,
pattern, contract, check — has exactly **one home surface**. One parent. The
path is the identity. Storage, ownership, and the menu are all this one tree.
Trees lay out deterministically and read at a glance; that legibility *is* the
predictability goal (`reset.md` goal #4).

**Sharing is resolved by altitude, not by multi-parent.** When a rule applies to
several surfaces, it is placed at the **lowest common ancestor** and **cascades
down**. The brand-wide color rule lives in `core` and flows everywhere. An
email-wide voice lives in `email` and flows to `email/marketing` and
`email/reminder`. Cascade replaces the DAG for the common case. Most "diagonal"
sharing is really "lives higher up."

**The genuinely diagonal case gets a rare, explicit, visible edge.** "Applies to
email + web but not product" has no common ancestor short of root. That — and
only that — uses an explicit authored `shares` edge that the menu *shows* and a
human *writes on purpose*. It is never a smeared tag and never a silent second
parent. In diagram terms: a tidy tree with a small, countable set of labeled
overlay edges — never a force-directed hairball.

This is the org-chart-plus-dotted-lines pattern: the tree carries the weight,
explicit edges handle the few exceptions, and one mechanism is never asked to do
both jobs. It gives DAG-level expressiveness for the common case (through
altitude) while keeping tree-level legibility.

### Why this kills the old leak

`applies_to` smeared across nodes (Leak A / Leak E) was exactly an implicit DAG:
every node carrying `applies_to: [a, b]` is a node with two parents. Replacing it
with **placement + cascade + rare explicit edge** is the death of that leak.
Inheritance returns, but disciplined: *down the containment tree only.* No
mixins, no priority weights, no union-merge-by-id — just "ancestors contribute to
descendants," the most predictable inheritance there is. This satisfies
`reset.md` goal #4 and the "model does not bend" rule in `purposes.md`.

## Grouping is placement, not tags

The point-1 coupling fix, made concrete:

> A node's surface is **where it is stored**, not a property it carries. You
> *place* an exemplar into `email/marketing`. You do not stamp
> `surface_type: email` onto it.

This is how Layer 1 content stays constant while its *coordinate annotations* are
removed. The grouping moves from smeared per-node fields
(`applies_to` / `surface_type` / `scope`) to **storage location in the surface
tree** plus an authored surface manifest. The description stops influencing the
coordinate space, because the description no longer carries coordinates at all.

## The description is the keystone

A surface carries an **optional description** authored in natural language:
*"a module is a self-contained sub-product; billing and payouts are modules."*

This single field is what lets the system stay taxonomy-free and still resolve
fluid, author-invented vocabulary. The reasoning:

- `email` resolves on its name alone — self-evident.
- `modules` is meaningless to a matching agent until an author *describes* it.
- The description is the bridge between author vocabulary and natural-language
  asks.

Descriptions are **optional but agent-draftable**. An agent can draft a
surface's description *from the content already grouped under it*; a human
approves it via git (git stays the approval boundary). The authoring burden is
"review a draft," not "write from scratch." Present a description when resolution
would otherwise be ambiguous; skip it when the name is self-evident.

## Resolution is BYOA: Ghost emits a menu, the agent matches

The resolution model, medium-agnostic:

```
any evidence  ──>  agent matches against the described menu  ──>  Ghost returns
(path|prompt|                                                     core + that
 explicit|pkg-id)                                                 surface's slice
```

Division of labor (this is the BYOA boundary from
`fingerprint-first-architecture.md`):

- **Ghost (deterministic, no LLM):** stores the surface tree; on request emits
  the **menu** — surfaces with their descriptions and shapes. Once a coordinate
  is chosen, deterministically returns `core + that surface's slice` (the slice =
  the surface's own nodes + everything cascaded from its ancestors + any explicit
  shared edges). Ghost does zero NLP.
- **Host agent (inference):** already holds the prompt. Reads the described menu,
  picks the surface. Path / diff / explicit name / package id are *additional
  evidence* it may use, never requirements.

**Ambiguity returns the menu, never the whole tree.** When evidence does not
resolve to a surface, Ghost returns the **surface menu** and asks which one —
it never dumps the whole fingerprint. This is the structural cure for the
global-fallback brand-mixing failure: in outcome 3, mixing a customer's flyer
voice into their email is *the* failure mode, and a menu-instead-of-dump makes it
impossible. (`purposes.md` leaks #1 and #2, resolved.)

## How the four outcomes resolve

| Outcome | Evidence the agent uses | Resolves to |
| --- | --- | --- |
| 1 In-repo UI, existing file | path → surface | that surface's slice, before building |
| 1 In-repo UI, new work | prompt → surface (or menu) | chosen surface's slice |
| 2 PR gate | diff paths → surface(s) | checks for those surfaces, against the diff |
| 3 Customer flyer (no repo) | prompt → surface | `core + flyer`, never `email` |
| 4 Portable brand | package id → tree | the whole tree as a consumable resource |

One model. The medium is just an adapter on the front. **This is also the
contract/binding split (`contract-and-binding.md`) falling out for free:** the
surface tree + the description it holds *is* the portable contract (outcomes 3 &
4, no repo needed); path→surface and diff→surface are the repo conveniences
(outcomes 1 & 2). We did not have to decide contract-vs-binding to design the
coordinate — designing it medium-agnostically produced the split, exactly as the
layers note predicted.

## What a surface needs (the shape, in prose)

Stated as obligations, not a schema (schema is a follow-on note):

- **id / name** — the author's chosen label, slug-shaped.
- **description** — optional, natural language, agent-draftable. Present when the
  name is not self-evident.
- **parent** — at most one (strict tree). Absent = top-level under `core`.
- **slice** — the nodes placed in this surface. Placement, not tags.
- **shares** — optional, rare, explicit edges to other surfaces for the
  irreducibly-diagonal case. Menu-visible.

Resolution against a surface yields: its own slice + cascaded ancestor slices +
shared-edge contributions. `core` is the root every surface inherits.

## What each layer asks of the coordinate space

Confirming the design serves all consumers (the layer rule, `reset.md`):

- **Selection (3):** "evidence → which surface → its slice." Served by the menu +
  deterministic slice resolution. No NLP in Ghost.
- **Governance (4):** "this diff touches which surfaces → run their checks."
  Served by path→surface mapping over the tree.
- **Comparison (5):** "compare these surfaces / whole trees." Served by the tree
  being a clean, portable structure.

A new purpose still gets a new layer, never a new field on intent / inventory /
composition.

## The delete list

Only now, after the clean design exists, do we name what it replaces. These are
the back-formed coordinate systems the design above supersedes. (Read at this
point, not before, to avoid anchoring.)

| Dead thing | Why it dies | Replaced by |
| --- | --- | --- |
| `inventory.topology` (scopes, surface_types) inside the fingerprint | Coordinate space trapped in the description (Leak A) | The surface tree, a Layer 2 artifact |
| `applies_to` on principles / contracts / patterns | Smeared tags = implicit DAG (Leak A/E) | Placement + cascade from ancestors |
| `surface_type` / `scope` on exemplars and situations | Same: nodes self-tagging coordinates | Placement (storage location) |
| `ghost.map/v1` / `map.md` (`ghost-core/map/`) | A *prior, richer* coordinate attempt, but repo-structure-shaped and medium-coupled (path/build-system/render-strategy baked in) | The medium-agnostic surface tree |
| `child-wins-by-id` union merge as ownership (Leak E) | Ownership is git/CODEOWNERS; merge did a governance job | Cascade down the containment tree |
| `global-fallback` whole-tree dump | Brand-mixing failure | Menu-instead-of-dump on ambiguity |

The crucial honesty for the sadness that started all this: **the description core
is untouched, and the two dead coordinate systems are being unified into one
clean thing — not thrown away into a void.** This is a teardown of one layer
inside a frame that protects the three layers that work. Greenfield where it's
earned; foundation kept where it's solid.

## Decisions locked in this note

1. A surface = author-named group + optional description + sub-surfaces. Ghost
   ships the mechanism, never a taxonomy.
2. Grouping is by placement (storage location), not tags. Layer 1 content stays
   constant; its coordinate annotations are removed.
3. Topology = strict containment tree + cascade-from-ancestors + rare explicit
   shared-edges. No silent multi-parent.
4. Resolution is BYOA: Ghost emits a described menu deterministically; the agent
   matches; Ghost returns `core + surface slice`. Ghost does no NLP.
5. Ambiguity returns the menu, never the whole tree. (Brand-mixing cure.)
6. Descriptions are optional but agent-draftable, human-approved via git.
7. Medium-agnostic: path / prompt / explicit name / package id are evidence, not
   privileged selectors. Designed from the no-repo case (outcome 3).

## Not a plan

This note designs the coordinate space and names what it replaces. It schedules
no moves, writes no schema, renames no command. Concrete extraction — the surface
schema, the slice resolver, the menu emitter, the migration off `topology` /
`applies_to` / `map.md` — should each be proposed in its own note and linked back
here for the design rationale, exactly as `reset.md` asks.

Contracts to keep stable while this is explored: `ghost.fingerprint/v1`,
`ghost.validate/v1`, `ghost.fingerprint-package/v1`, `ghost.check-report/v1`.

## Read-back

This note succeeds if:

- The coordinate space is defined without a taxonomy and without privileging any
  medium.
- All four outcomes resolve through one model.
- The point-1 coupling is fixed: the description no longer carries coordinates.
- The topology is a clean tree a person can hold in their head, with cascade for
  the common overlap and a handful of visible edges for the rare diagonal.
- Nothing in Layer 1, 4, or 5 had to change to make Layer 2 right.
