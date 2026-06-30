---
status: exploring
companion: context-graph.md, scenarios-worked.md, contract-storage.md
source: external POC (block-as-intelligence / .ghost) exercising Ghost as a multi-brand, multi-medium composition graph
---

# Composition-graph gaps: three schema changes a real composition graph forces

An exploration, not a decision. A large external POC
(`block-as-intelligence/.ghost`) used Ghost 0.18 not as "the fingerprint of one
product surface" but as Ghost's *stated* next identity — a **curated, opinionated
context graph queried by traversal** (`context-graph.md`,
`fingerprint-first-architecture.md`). It modelled a whole company's interface
composition: `core → brand → audience → product` on the containment spine, with
`mediums/` and `contracts/` as lateral axes, and a scenario suite that resolves
**never-encoded signals** into traced outputs where *every interface decision
cites a node*.

That use exercised the graph harder than any first-party fixture, and it surfaced
three gaps. Each is **already anticipated in our own idea docs** — this note
pins them to code, separates the genuine schema gaps from things that are
correctly the consumer's job, and traces what each nets out as.

## Triage: what is ours vs. theirs

The POC wanted several things. Most are **correctly out of scope** for Ghost and
belong in the consuming package's prose — Ghost's BYOA line ("CLI does
deterministic work; the agent interprets") is right to refuse them:

| Want | Verdict |
|---|---|
| Conflict-precedence ("when two contracts collide, which wins?") | **Consumer's job.** Interpretation. Never a Ghost primitive. |
| Coverage-gaps / declared silence | **Consumer's job.** A prose node with a `description`; discoverable by traversal already. |
| Mode axis (`shape/implement/review/...`) | **Consumer's job.** A resolution-time concern, not graph structure. |

The remaining three are **genuine schema gaps** — the consumer literally cannot
author around them, because they live in the layer Ghost computes on:

1. **Sub-node decision identity** — the graph's smallest addressable unit is the
   file; design decision is finer.
2. **Composition-fit edge types** (`governs`, `projects`) — the `relates` vocab
   is from the abandoned similarity model; a composition graph needs functional
   edges. *(Already flagged deferred in `node/types.ts`.)*
3. **Tree-aware check routing** — `surface:` is a flat slug, so checks cannot
   follow the very tree we made load-bearing.

---

## Gap 1 — Sub-node decision identity (`anchors`)

### The problem, in code

`ghost-core/node/types.ts` reads exactly three frontmatter keys into the graph
(`description`, `relates`, `incarnation`); `schema.ts` is `.passthrough()`, so
any other key is parsed and **dropped from `GhostGraphNode`**. The smallest thing
Ghost can address, gather, route, or lint is therefore the **node (file)**.

But design decision-making is naturally **sub-node**. One persona node legitimately
holds a dozen distinct, separately-citeable decisions ("size to need not
eligibility", "verify before money action", "non-offer is a valid output"). The
POC encoded these as a passthrough `anchors:` block and cited them across its
scenario suite as `node-id#anchor`:

```yaml
# resolution.yml
owned_by: cash-app/buyer/afterpay#size-to-need-not-eligibility
```

This is the load-bearing move of their entire proof — "every decision traces to
the node that owns it." And Ghost is **blind to all of it**: `ghost validate`
returns 0 errors whether that anchor exists or is a typo. The headline claim of a
composition graph — *traceability* — currently rests on references no Ghost verb
can resolve.

### Why this is a real gap, not consumer over-reach

`decisions[]` were **first-class in Ghost 0.2–0.4** and were dropped in the
node-graph rewrite (per `compare-drift-fleet-rethink.md` lineage). The POC is not
inventing a new primitive; it is **re-implementing one Ghost removed**, in prose,
because the graph still needs addressable units below the file. A "context graph
that captures *why*" whose finest addressable unit cannot name a single *why* has
a granularity gap.

### Proposal

Promote a fourth reserved key, `anchors`, to a **first-class, addressable**
node member — the named decisions a node owns.

```yaml
# ghost.node/v1 frontmatter
anchors:
  - id: size-to-need-not-eligibility
    kind: required            # stance | required | forbidden | interface_choice | holds
    source: squareup/writing/references/.../fit.md   # optional provenance (Gap 1b)
```

- `node/schema.ts`: add an optional `AnchorSchema[]`; ids are slugs unique within
  the node. (Keep `.passthrough()` for everything else.)
- `graph/types.ts`: add `anchors: GhostAnchor[]` to `GhostGraphNode`.
- New resolvable ref form `<node-id>#<anchor-id>`, validated by graph-phase lint
  exactly like `relates` targets: **unresolved `#anchor` is a lint error.**
- `gather` emits a node's anchors as an addressable list; `review` can ground a
  finding on a specific `#anchor`.

**Nets out as:** the citation `node#anchor` becomes a *checked fact*, not an
honor-system string. Traceability — the thing a composition graph exists to
provide — gets the same validation guarantee `relates` already has. This also
gives `compare`/`drift` (parked) a finer diff unit than the file when they return
graph-native.

### Gap 1b — provenance on the decision (folded in)

Old facet schema had `inventory.sources[] {kind: registry|file|url|package}` —
also dropped. The POC re-creates it ad-hoc by citing `squareup/writing/...` in
prose. If `anchors` land, an optional `source:` per anchor (above) re-lands
structured provenance at the decision grain, and `ghost verify --root` can check
those paths resolve — exactly what `verify` already does for exemplar paths.

---

## Gap 2 — Composition-fit edge types (`governs`, `projects`)

### The problem, in code

`node/types.ts` closes the `relates` vocab to `reinforces | contrasts | variant`
and says, in a comment:

> `governs` / `projects` are deliberately deferred (Scenario D and explicit
> medium projection) — not in v1.

`scenarios-worked.md` confirms the workaround in the wild: *"a real **governs**
relationship (deferred; faked as a qualified relate)."* The POC hit this exactly:
**~95% of its edges are `reinforces`**, because that vocab is *similarity*
(descended from the deleted embeddings + 13-visual-dimension model), while a
composition graph's edges are *functional*:

| Edge the POC needed | Forced to write | Should be |
|---|---|---|
| persona → the brands/mediums it can be expressed in | `reinforces` | **`projects`** (selectable axis) |
| persona/medium → a contract it must obey | `reinforces` | **`governs`** (obligation) |
| contract → contract it builds on | `reinforces` | `reinforces` ✅ (genuine) |
| notification ↔ conversational | `contrasts` | `contrasts` ✅ (genuine) |

When one qualifier covers 95% of edges it has stopped discriminating and become
punctuation. The consumer cannot fix this — the vocab is closed in Ghost.

### Proposal

Land the two already-named-deferred kinds:

```ts
export const GHOST_NODE_RELATION_KINDS = [
  "reinforces", "contrasts", "variant",
  "governs",    // obligation: target is a contract/decision the source must satisfy
  "projects",   // selectable axis: target is a form (brand/medium) the source can take
] as const;
```

- `governs` gives `review`/`checks` a **typed obligation edge** to ground on — a
  finding can say "violates the `disclosure-surface` contract this node is
  *governed by*", deterministically.
- `projects` makes the **selection axes** (brand, medium) machine-distinguishable
  from lateral reinforcement. `gather` can then split a corridor's edges into
  "forms this node can take" vs "contracts it must obey" — which is precisely the
  resolution-time decision (*which brand? which medium?*) a generation pipeline
  makes.

Note `projects` overlaps conceptually with `incarnation` (both about "the form
the expression takes"); the design question is whether `projects` is an edge or
whether brand becomes a second projection tag alongside `incarnation`. Worth
resolving as part of "explicit medium projection" already noted in `types.ts`.

**Nets out as:** the edge vocabulary stops being decorative. The flat-`reinforces`
smell disappears not by removing edges but by giving the two structural roles
(obligation, projection) real names. Composition becomes legible: gather a
persona and you can see, by edge type, what it *must obey* vs what *forms it can
take*.

---

## Gap 3 — Tree-aware check routing

### The problem, in code

`check/lint.ts`: `const SURFACE_ID = /^[a-z0-9][a-z0-9_-]*$/` — a check's
`surface:` **must be a flat slug, no slashes.** But `route.ts`
(`selectChecksForSurfaces`) matches that slug against `ancestorChain`, which
returns full **path ids** (`cash-app/buyer/afterpay → cash-app/buyer → cash-app
→ core`). A flat slug can therefore only ever equal `core` or a **top-level**
node id.

Consequence, hit live in the POC: a check meant to govern `buyer` worked while
`buyer` was top-level; the moment a `brand` tier nested it to `cash-app/buyer`,
**no legal `surface:` value could target it.** The tightest scope available
collapsed up to `cash-app` (also catching unrelated siblings). *The deeper and
more correct the graph gets, the coarser its governance gets* — a direct
contradiction of "the directory tree **is** the graph."

### Proposal

Allow `surface:` to be a **node ref (path id)**, not a flat slug:

- `check/lint.ts`: replace `SURFACE_ID` with the existing `NodeIdSchema` /
  `NodeRefSchema` from `node/schema.ts` (which already permits `/`). One-line
  swap of the validator; routing in `route.ts` already compares against full ids,
  so **`selectChecksForSurfaces` needs no change** — it starts working the moment
  lint stops rejecting the slash.
- `surface-guard.ts` already validates a named surface against the graph menu and
  suggests closest ids, so unknown/typo'd nested surfaces get the existing
  `ERR_UNKNOWN_SURFACE` treatment for free.

**Nets out as:** check placement regains parity with the node graph. A check can
govern any node at any depth and cascade to its descendants exactly as context
slices already do. This is the smallest change of the three (effectively a
validator swap) and arguably a **bug fix**, not a feature — routing was already
written to be path-aware; only lint was holding it to flat slugs.

---

## Summary — what the three net out as

| Gap | Change | Surface area | Nets out as |
|---|---|---|---|
| 1. Decision identity | `anchors[]` as reserved, addressable, `#`-citeable + lint-resolved | `node/schema.ts`, `node/types.ts`, `graph/types.ts`, graph-lint | **Traceability becomes verifiable.** Re-lands dropped `decisions[]` at file-grain; gives parked `compare`/`drift` a sub-file unit. |
| 1b. Provenance | optional `source:` per anchor + `verify` path check | as above + `verify` | Re-lands dropped `inventory.sources[]` at decision-grain. |
| 2. Edge types | add `governs`, `projects` to the relation vocab | `node/types.ts` (+ consumers that branch on kind) | **Edges stop being punctuation.** Obligation vs projection become machine-legible; ends the "fake it as `reinforces`" workaround the idea docs already admit. |
| 3. Check routing | `surface:` accepts a path id, not a flat slug | `check/lint.ts` (validator swap) | **Governance follows the graph.** Bug-fix-shaped; routing was already path-aware. |

Common thread: **all three are Ghost finishing its own migration.** The pivot
from a similarity model (`fingerprint.yml` + embeddings + fixed visual
dimensions) to a graph model (prose nodes + typed edges) dropped `decisions[]`,
`inventory.sources[]`, and a functional edge vocab, and left check routing on the
pre-tree slug. The external POC didn't push Ghost past its design — it stress-
tested Ghost *toward* the identity Ghost's own docs already claim, and landed in
the crater the rewrite left. Closing these three makes "a curated context graph
queried by traversal" true for traceability, composition, and governance — not
just for retrieval.

## Open questions

- **`projects` vs `incarnation`:** one mechanism or two? Brand and medium are
  both "forms the expression takes" — does brand become a second projection tag,
  or is `projects` the general edge and `incarnation` its medium-specialization?
- **Anchor kinds:** is the kind vocabulary (`stance|required|forbidden|...`) part
  of `ghost.node/v1`, or free-form passthrough on the anchor like `relates` is
  optional? Leaning closed-but-small, mirroring the relation-kind decision.
- **Migration:** if `decisions[]` semantics return as `anchors`, should
  `migrate-legacy.ts` map the old 0.2–0.4 `decisions[]` onto them?

---

## Revision (post-implementation triage)

The three proposals above were prototyped, then re-evaluated against two
minimalist references: the Open Knowledge Format (OKF) spec — *"the specific
kind of relationship is conveyed by the surrounding prose, not by the link
itself … consumers MUST tolerate broken links"* — and Vercel's *Teaching agents
product design*, whose Skill Integrity rule keeps deterministic checks mechanical
and keeps everything that needs interpretation in prose, with its evidence and
degree of freedom. The bar shifted from *"is this a real
gap?"* to *"does this earn schema an LLM doesn't need?"* Result:

- **Gap 3 — superseded by removing routing entirely.** The fix (accept a node
  path id as a check `surface:`) shipped briefly, then a sharper question landed:
  in the internal agent-check flow, *every check always fires* — the agent judges
  relevance. So the routing gate (`check.surface` → `selectChecksForSurfaces`)
  had no live consumer. Routing was removed wholesale: `check.surface`,
  `selectChecksForSurfaces`, `RoutedCheck`, and `CheckRelevance` are gone. The
  `--surface` flag survives, but only to *ground* the named surfaces (it feeds
  `resolveGraphSlice`), never to filter checks. This is the same lens applied to
  the system itself: a whole subsystem built for a gating step that doesn't
  happen.
- **Gap 2 — rejected.** The motivating problem (95% of edges typed
  `reinforces`) is solved more cheaply by the *untyped* edge Ghost already
  supports, plus one prose sentence. Typing `governs`/`projects` adds closed
  vocabulary to a system whose cited ancestor (OKF) deliberately keeps edges
  untyped, with no deterministic consumer that needs the split. Pulled.
- **Gap 1 — rejected as built; idea partially survives.** The `anchors[]`
  array (closed `kind` enum, floating ids that bound to no text span,
  unresolved-citation-as-hard-error) was the wrong *form* and was removed. But
  the *citation idea* has real support — Vercel gives rules stable IDs that cite
  their source (`Source: copy.md > Actionable`), and Ghost already does the same
  one level coarser (review requires findings to cite grounding nodes;
  `review-packet.ts` `required_finding_citations`). The chain
  *finding → check → surface grounding* exists today at node granularity.

### The correct successor to Gap 1 (built — and now the check's only graph binding)

This shipped as an optional `source:` on the check, consumed by `review`.
It mirrors Vercel's `Source: copy.md >
Actionable` literally — as a **soft, optional pointer on the check**, not a
schema on every node. With routing gone (see Gap 3 above), `source:` is the
check's *only* binding to the graph: it tells the reviewer which prose the check
enforces, so a finding can cite the section it derives from.

```yaml
# checks/destructive-names-action.md
name: destructive-names-action
description: Destructive CTAs follow Verb + Noun.
severity: high
source: checkout/payment > Confirmation     # optional: node path + heading anchor
```

Design constraints (the lessons from this thread, encoded):

- **Soft, OKF-tolerant.** An unresolved `source:` is a *warning*, never a hard
  `validate` error. It "may simply represent not-yet-written knowledge."
- **Heading-anchored, not id-keyed.** `node > Heading` points at a real span of
  prose (the markdown heading), so it can't drift into the "floating label that
  binds to nothing" incoherence that sank `anchors[]`. No new id space, no
  closed `kind` enum.
- **On the check (or finding), not on every node.** It rides the artifact that
  makes a claim, exactly where Vercel puts it — not as a frontmatter array
  bolted onto authoring.
- **Only when a consumer needs it.** `review` is that consumer: the routed-checks
  section now renders `— enforces \`<source>\`` and the prompt instructs the
  agent to cite the check's `source:` section when it declares one. A future
  `compare`/`drift` can consume the same field.
