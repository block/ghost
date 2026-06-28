---
status: exploring
---

# Ghost layers: a triage map

This note is subordinate to `fingerprint-first-architecture.md` (settled). It
does not change that decision. It applies it. The settled memo says the
fingerprint is the durable *descriptive* artifact and everything else is a tool
that consumes, validates, governs, or compares it. This note takes that one
sentence and asks, file by file, **which layer is this, and is it where it
belongs?**

It is a triage map, not a rewrite plan. The goal is to make the size of the
thing feel smaller by giving every piece a home.

## The one-line diagnosis

The descriptive center is clean. The operational rings leaked into its shape.

Intent / inventory / composition is genuinely *one surface seen through three
angles*. It survived every refactor (`bd1ced5`, `f393720`, `7ecd13c`) because it
is coherent. The pain is not there. The pain is that **selection, routing,
merge, governance, and comparison** are operations *on* the fingerprint that
pressed back *into* its structure, because the fingerprint was the only durable
thing to hang them on.

That is a hopeful diagnosis. The rot is in a ring, not the core.

## The five layers

| Layer | Name | One line | Owns |
| --- | --- | --- | --- |
| 1 | **Description** | What the surface is. | intent, inventory, composition |
| 2 | **Map** | The coordinate space the surface lives in. | dimensions, scopes, surface types |
| 3 | **Selection** | Path or prompt to a narrow view of 1. | relay gather, routing, request resolution |
| 4 | **Governance** | Whether a change stays faithful, and who owns what. | checks, drift, ownership |
| 5 | **Comparison** | Read-only analytics across many fingerprints. | distance, cohorts, fleet |

The discipline rule that comes from this map:

> A new purpose gets a new layer, never a new field on intent / inventory /
> composition.

Most of the recent agony was the question "does this go in the fingerprint?"
having no answer. With the layers named, the question becomes "which layer is
this?" — and that almost always has an obvious answer.

## Triage: current code to layer

| Code | Layer | State |
| --- | --- | --- |
| `ghost-core/fingerprint/{schema,types,lint}.ts` (intent, composition, inventory minus topology) | 1 | **Clean.** The center. Leave it alone. |
| `inventory.topology` (scopes, surface_types) | 2 trapped in 1 | **Leak A.** A coordinate space living inside a description file. |
| `applies_to` on principles / contracts / patterns / exemplars / situations / checks | 2 trapped in 1 | **Leak A.** The same coordinate space smeared across every node. |
| `context/graph.ts` (`Applicability`, `buildScopes`, `matchScopes`, `pathsOverlap`) | 2 | Map logic, but reconstructed at runtime from the smeared fields above. |
| `fingerprint/lint.ts` (`checkTopologyRefs`, `fingerprint-surface-type-unknown`) | 2 | Already enforces the map vocabulary. This is the source of truth to protect. |
| `context/entrypoint.ts` (`buildContextEntrypoint`, `CAPS`, `relevanceScore`) | 3 | **Leak D.** `CAPS` is a truncation crutch from having no real map to narrow with. |
| `context/selection-reasons.ts` (`directSelectionReasons`, `expandOneHopWithReasons`, `globalFallbackRefs`) | 3 | Selection. Correct layer. One-hop expansion is not exclude-aware yet. |
| `context/selected-context.ts` (`SelectedContextGap`, hits, omissions) | 3 | Selection output contract. Correct layer. |
| `relay.ts`, `relay-command.ts`, `relay-runtime-helpers.ts` | 3 | Selection runtime. Correct layer. |
| `context/request-resolution.ts`, `relay-request.ts`, `request-stack-document.ts` | 3 | Prompt to view. Correct layer. Has its own selector matcher (see Leak C). |
| `context/relay-config*.ts`, `default-relay-config.ts`, `projection.ts`, `relay-context.ts`, `relay-modes.ts` | 3 | Selection plumbing. Correct layer. |
| proposed `relay.yml` / `routes` facet | 3 | **Leak B.** Wants a filename and a name Layer 3 already used. |
| `ghost-core/checks/{schema,lint,routing,types}.ts`, `validate.yml` | 4 | Governance gates. Correct layer. |
| check / review / ack / track / diverge commands | 4 | Drift governance. Correct layer. |
| `scan/fingerprint-stack.ts` (`mergeFingerprints`, `mergeById`, `mergeStrings`, `child-wins-by-id`) | 4 wearing a 1 costume | **Leak E.** A merge algorithm doing an ownership job. |
| `ghost-core/embedding/*`, `compare` command, `packages/ghost-fleet` | 5 | **Clean consumer.** Reads description, never writes back. Hold this line. |

## The named leaks

**Leak A — the map is trapped inside the description.** `inventory.topology`
plus every node's `applies_to` is a coordinate system masquerading as a property
of the surface. It is Layer 2 living inside Layer 1. This is the highest-leverage
cut because Layers 3, 4, and 5 all query it: fix it once, three consumers get
cleaner. Extracting an explicit surface map is the one structural change worth
making first.

**Leak B — `relay.yml` collision.** `relay-config-loader.ts` already discovers
`.ghost/relay.yml` and hard-throws unless it validates as
`ghost.relay-config/v1`. The proposed routing facet wants the same path. Two
Layer 3 things fighting for one filename, and "Relay" already names the
subsystem. Resolution: name the facet for what it does (the map / routing), not
"relay."

**Leak C — duplicate vocabulary.** A new `selectors` block would re-declare
`surface_type`, which `inventory.topology.surface_types` already owns with
*error*-level lint enforcement. Two sources of truth for one Layer 2 concept.
Resolution: the map owns the vocabulary; selection references it. Only genuinely
new axes (e.g. `medium`) are new.

**Leak D — `CAPS`.** Hardcoded truncation (`intent: 6, composition: 6, ...`) in
selection is a crutch from when there was no good map to narrow with. With a real
Layer 2, the region is the budget. Keep caps only on the global-fallback path.

**Leak E — nesting as ownership.** `mergeFingerprints` (union-by-id, child-wins)
performs a governance/ownership job with a data-model mechanism. It couples
failure domains across teams (a root edit can break a leaf's gather), allows
silent overrides, and supports union-only inheritance. Ownership is a git /
CODEOWNERS concern. Resolution: demote nesting to authoring sugar; let
governance live in Layer 4.

## What is already clean (the reassurance)

- **Layer 1** is coherent and battle-tested. You feel no pain here, and that is
  the signal that the model is right.
- **Layer 5** (compare, fleet, embeddings) is already a well-behaved consumer.
- **Layer 4 checks/drift** is correctly separated; only nesting leaks.

You did not lose the plot. The code drifted from a doc you already ratified. The
fix is alignment, not reinvention.

## Why this happened (and why it is fine)

You could not have drawn these boundaries up front. You had to build the bundled
version to discover where it wanted to split. Every collision in this exploration
— the `relay.yml` clash, the double vocabulary, the union merge — was not bad
design surfacing. It was a seam becoming visible enough to cut along. The mess is
the map you could not have drawn before you made it.

## Not a plan

This note assigns homes; it does not schedule moves. Any actual extraction
(surface map, routing facet name, nesting demotion) should be proposed in its own
note and linked back here for the layer rationale. Nothing here changes a schema,
a command, or a contract today.

Contracts that exist and should be kept stable while triaging: `ghost.fingerprint/v1`,
`ghost.validate/v1`, `ghost.fingerprint-package/v1`, `ghost.relay-config/v1`,
`ghost.relay-request/v1`, `ghost.relay.gather/v2`, `ghost.check-report/v1`.

## Read-back

This note is successful if a contributor can take any file in
`packages/ghost/src` and answer two questions without guessing: which layer does
this serve, and is it currently living in that layer or leaking into another.
