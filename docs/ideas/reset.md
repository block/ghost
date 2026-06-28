---
status: exploring
---

# Reset: how to approach Ghost

This note is subordinate to `fingerprint-first-architecture.md` (settled). It
changes no decision in that memo. It exists for a different reason than the
others in this folder: not to explore a new idea, but to stop circling.

Three notes — `purposes.md`, `ghost-layers.md`, and `contract-and-binding.md` —
were written from a real and honest discouragement: that Ghost had been
overcomplicated, that it tried to do too much, that the plot was lost. This note
takes those three seriously, reads what they actually concluded, and turns the
feeling into a single approach with a defined purpose, fixed goals, named
layers, and a clean separation of concerns.

The short version: **you are not lost, and nothing you built was wasted.** The
three notes are not three problems. They are one diagnosis written three times,
and they agree on the first move. This note names that move and the discipline
that keeps it from being undone.

## The diagnosis the three notes already share

Read together, the circling notes say one thing:

- **The descriptive core is right.** Intent / inventory / composition is *one
  surface seen through three angles*. It survived every refactor because it is
  coherent. `ghost-layers.md` calls this the clean center. `purposes.md` calls
  it the model that does not bend. `contract-and-binding.md` calls it the part
  that "survives intact."
- **The pain is leakage, not scope.** Selection, routing, merge, and governance
  are *operations on* the fingerprint that pressed *into* its shape, because the
  fingerprint was the only durable thing to hang them on. `ghost-layers.md`
  names this Leak A. `contract-and-binding.md` names it "the map the binding
  impersonates with filesystem paths." `purposes.md` names it "merge to
  assemble, select to deliver."
- **They converge on one cut.** Extract the coordinate space — `topology` plus
  the smeared `applies_to` — out of the description and give it its own home.
  The layers note calls this "the one structural change worth making first." The
  contract note says doing it *is* the contract/binding split seen from another
  angle: "do one and the other falls out."

That is the whole reset. The mess felt like five colliding concepts. It is one
seam, visible now because the bundled version was built first. The disorientation
is the ordinary feeling of standing right after the hard part, where a mess
turns back into a map.

## Purpose (one sentence, does not move)

> Ghost captures the composition of a product surface — the intent behind it,
> the materials it draws from, and the patterns that make it feel intentional —
> as a portable, checked-in contract that humans approve and agents act from.

This is the `fingerprint-first-architecture.md` sentence, unchanged. Everything
below serves it. If a proposed feature does not serve this sentence, it is not a
Ghost feature; it is a projection, a tool, or scope creep.

## Goals (what "right" means)

1. **One durable artifact.** The checked-in fingerprint is the source of truth.
   Every consumer reads it through a projection; no consumer changes its shape
   or its merge semantics to suit itself. (`purposes.md`, the rule.)
2. **A clean descriptive core.** Intent / inventory / composition stays exactly
   what it is. New purposes never become new fields on it. (`ghost-layers.md`,
   the discipline rule.)
3. **Operations live in their own layer.** Selection, governance, and comparison
   are rings around the core, not properties of it.
4. **The model is dumb on purpose.** Nesting is storage and ownership;
   routing plus filtering is selection. No mixins, no priority weights, no
   write access to the merge. Predictability is the feature.
5. **Portability is allowed.** The artifact may describe surfaces no repo
   consumes (non-UI, multi-surface brand). That is not scope creep; it is the
   contract being legitimately bigger than any one binding.

## The layers (the separation of concerns)

This adopts the five layers from `ghost-layers.md` verbatim, because they are
already correct. The reset is to *commit* to them as the answer to every "does
this go in the fingerprint?" question.

| Layer | Name | One line | Owns |
| --- | --- | --- | --- |
| 1 | **Description** | What the surface is. | intent, inventory, composition |
| 2 | **Map** | The coordinate space the surface lives in. | dimensions, scopes, surface types |
| 3 | **Selection** | Path or prompt to a narrow view of layer 1. | relay gather, routing, request resolution |
| 4 | **Governance** | Whether a change stays faithful, and who owns what. | checks, drift, ownership |
| 5 | **Comparison** | Read-only analytics across many fingerprints. | distance, cohorts, fleet |

The two rules that make these layers load-bearing instead of decorative:

> **The layer rule.** A new purpose gets a new layer, never a new field on
> intent / inventory / composition.

> **The projection rule.** A consumer may read through any projection it likes.
> It may not change the *shape* of the fingerprint or its *merge semantics* to
> suit itself. If serving a purpose requires bending the shape, that is a leak
> to fix at the boundary, not a redesign of the artifact.

Layers 1, 4 (checks/drift), and 5 are already clean per the triage. The work is
entirely in extracting Layer 2 and letting Layer 3 stop improvising around its
absence.

## The first cut (the only thing this note schedules)

Everything above is stance. This is the move. Do exactly one thing first:

> **Extract the map.** Lift the coordinate space — `inventory.topology` plus the
> `applies_to` smeared across nodes — out of the description and make it an
> explicit Layer 2 artifact that selection, governance, and comparison query.

Why this one, before contract/binding, before any kill list, before renames:

- It is the leak all three notes independently point at (Leak A / the spine /
  the impersonated map).
- It is the highest leverage: Layers 3, 4, and 5 all query the coordinate space,
  so fixing it once makes three consumers cleaner.
- It unblocks the bigger question without deciding it early. Once the map is its own
  thing, the contract/binding split *falls out* of it rather than being a second
  independent surgery. You can decide that question later, from a cleaner base.

What this first cut explicitly does **not** require:

- No decision on contract vs binding yet.
- No renames of commands or schemas.
- No removal of `survey`, `diff`, `describe`, or any legacy format yet.
- No new public interface.

The map extraction gets its own proposal note with concrete schema, linked back
here for rationale. This note only fixes which cut is first and why.

## What stays parked (so the circling stops)

These are real and worth doing, but they are *downstream of the first cut* and
must not be started in parallel, because doing them now is what re-creates the
overwhelm:

- **Contract vs binding** (`contract-and-binding.md`). Revisit *after* the map
  exists; the split becomes mostly mechanical once the coordinate space is
  extracted.
- **Kill lists** (legacy formats, `survey`, direct-markdown commands). These are
  cleanup, not architecture. They do not block the core and can happen anytime.
- **Routing facet naming** (Leak B), **duplicate vocabulary** (Leak C), **CAPS**
  (Leak D), **nesting-as-ownership** (Leak E). All resolve more obviously once
  Layer 2 is real. Each gets its own note when its turn comes.

Parking these is not deferral-as-avoidance. It is the direct remedy for the
specific feeling that started this: too many open fronts at once. There is one
front now.

## How to hold the line (discipline going forward)

When any future change is proposed, answer two questions before writing code:

1. **Which layer is this?** If the honest answer is "it adds a field to intent /
   inventory / composition," stop — it is almost certainly a leak from another
   layer.
2. **Is this the model bending, or a projection reading?** If a consumer needs
   the shape or merge to change, fix the boundary, not the artifact.

If both questions have clean answers, the change is safe. If they don't, the
change is the next leak — write it down, don't build it yet.

## Read-back

This note succeeds if it replaces a feeling with a footing:

- The purpose is one sentence and it has not changed since the settled memo.
- "Did I overcomplicate it?" has an answer: no — five operations leaked into one
  file, and they are *sortable*, not wrong.
- "What do I do next?" has exactly one answer: extract the map. One cut, the one
  all three notes already agree on.
- Everything else has a home (a layer) or a queue (parked), so nothing has to be
  held in the head at once.

You did not lose the plot. The code drifted from a doc you already ratified, and
three notes you already wrote found the seam. The reset is to believe them, make
the one cut, and let the rest fall out.
