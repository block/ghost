---
status: exploring
---

# The context graph: Ghost as a curated, opinionated graph for generation

This note records a shift in how we frame Ghost's model. It is downstream of
`one-road.md` (remove the binding + nesting) and `contract-storage.md`
(facet-first vs surface-first storage), and it reframes both: the real shape of
the problem is a **curated, opinionated context graph**, and the right context
for an agent to generate an interaction is found by **traversing** it.

It composes with the build order already set: **one-road first**, storage and
anything here after. Nothing here is committed to code.

## The shift

We kept circling "which files, which buckets." That was the wrong altitude. The
question underneath is: **what is the model, really?** The answer the scenarios
forced:

> A Ghost contract is a **curated graph of design-context nodes**, semantically
> connected by **typed links**, on a **tree** (the `under` links), folded from
> free-form files into one in-memory document, and **queried by traversal** to
> compute the right context packet for a generative act.

Two things make it *Ghost* and not a generic knowledge graph:

1. **It is authored / editorial, not extracted.** We take a stance — *"here's
   what we think is the right pieces for a customer with a certain stance"* — not
   "here's what statistically exists." (The explicit rejection of the
   GraphRAG/extraction posture.)
2. **It serves generation across any medium.** Email, billboard, slide deck,
   product page, profile, checkout, and eventually voice systems and AI-generated
   screens. The unit is an **interaction**, not a "page."

## What is and is not load-bearing

- **`intent` / `inventory` / `composition`** are **ephemeral authorship
  guidance** — three things a good author keeps in mind while building the
  fingerprint (*have you captured the intent? do you have the inventory? is the
  composition expressed?*). They live in the author's head (prompted by the
  skill), guide the writing, then **dissolve.** They are **not** types, not a
  `nature`, not a field, not a heading, not a node kind. Once the fingerprint
  exists you cannot point at a node and say "that's the inventory one" — there
  are just nodes, written well, that collectively happen to cover the three
  because the author was thinking about them. **Zero presence in the schema,
  loader, graph, or lint.** Their entire footprint is the skill's authoring
  guidance (and maybe an `init` nudge).
- **`node` is machinery vocabulary, not public.** The graph is made of nodes;
  the code, loader, schema, and lint speak in nodes. But a *user* never needs the
  word — they speak the design language (the node ids and the prose) and run
  `gather <id>`. Like Git's "blobs/trees" backstage and "files/folders" up front.
  ("surface" is retired from both layers — it was the old overloaded container
  word; `node` replaces it in the machinery, the design prose replaces it for
  users.)
- **"Conforms to a schema"** means **machine-tractability**, not conceptual
  classification: a node has identity, resolvable links, and parses. That is the
  entire conformance gate.
- **The core job** is to serve the best **context packet** for a task. The
  surrounding machinery — trace, inspect, observability, lint, checks, loops,
  compare, drift — exists to make that packet trustworthy and improvable.
  Conformance exists to serve the machinery, not to constrain the guidance.

```
                    ┌─────────────────────────────────────┐
   prompt / task ──▶│  CORE JOB: serve the best CONTEXT     │──▶ generation
   (or system       │  PACKET for this task, crafted for    │    (any medium)
    trigger)        │  design generation                    │
                    └─────────────────────────────────────┘
                                   ▲
                    ┌──────────────┴──────────────────────┐
                    │  MACHINERY: trace · inspect ·         │
                    │  observability · lint · checks ·      │
                    │  loops · compare · drift              │
                    └──────────────────────────────────────┘
```

## Prior art: the substrate is converging (OKF)

We are not alone in this shape. Google Cloud's **Open Knowledge Format (OKF)**
(`GoogleCloudPlatform/knowledge-catalog`, `okf/SPEC.md`, v0.1 draft) is the same
*substrate*, arrived at independently for *data* knowledge: a directory of
markdown files with YAML frontmatter, folded into a graph, queried by traversal,
shippable by `git clone`, with no registry and no server. Vercel's product-design
skill (markdown + frontmatter references) sits in the same family.

This convergence is a strong signal: **"a directory of markdown+frontmatter that
self-describes and folds into a graph" is an emerging cross-industry standard.**
We should sit inside that family and stay `cat`-able and `git`-shippable rather
than over-inventing a substrate.

### Where we agree with OKF (adopt, we already chose most of this)

| Decision | OKF | Ghost |
| --- | --- | --- |
| Markdown + YAML frontmatter as the artifact | ✅ | ✅ |
| Envelope (frontmatter) + free body | ✅ | ✅ |
| `id` = file path with suffix removed | ✅ `tables/users` | ✅ `core/trust` |
| Folds into a graph, queried by traversal | ✅ | ✅ |
| Free organization; conformance is minimal | ✅ | ✅ |
| Permissive consumption (tolerate unknowns, broken links) | ✅ | ✅ |
| `git clone` = ship it; no registry, no server | ✅ | ✅ |
| Progressive disclosure (`index.md`) | ✅ | ≈ our `gather` menu |

Worth stealing outright: OKF's **`index.md`** (optional, synthesizable
progressive disclosure — the static cousin of our `gather` menu) and **`log.md`**
(scoped, date-grouped change history — a lightweight way to carry "why did this
intent change" without a database).

### Where we diverge from OKF, deliberately (this is our value)

OKF deliberately stops where it does because it catalogs *static data knowledge*
(a table is a table). Ghost's value starts exactly there:

1. **Typed links, not untyped prose links.** OKF §5.3: relationships are
   "conveyed by the surrounding prose, not by the link itself … treated as
   directed edges of an untyped relationship." Our links are typed — `under`
   (containment) and `relates` (lateral). `trace` ("why is this in the packet?")
   and `drift` ("has voice drifted across media?") need typed links to answer
   structurally.
2. **An explicit tree — not directory-implied hierarchy.** OKF derives
   parent/child from folders (§3). We reject that (the flat-vs-nested trap): the
   tree is the **declared `under` links**, with exactly one medium-agnostic root
   (the brand soul). Layout never implies hierarchy.
3. **A medium tag OKF has no concept of.** OKF's `type` is presentation/routing
   metadata for a static asset. We carry **medium** so one intent (a parent node)
   cascades into medium-bound children — the axis design generation lives on and
   data catalogs do not.
4. **Editorial + runtime, not descriptive.** OKF describes what exists; Ghost
   asserts what *should* be, carries **stances**, and has **medium-conditional
   checks** consumable at **runtime** (not just authoring time).

### Positioning

Ghost is **OKF-family, specialized for design generation.** Strip our typed
links and medium tag and a Ghost contract degrades gracefully into a readable
OKF-ish bundle — a generic markdown-knowledge consumer can still `cat` our
nodes. We do not catalog what exists; we compute the right context to *generate*
an interaction in a given medium.

## Vocabulary (and what we refused to add)

Terminology sprawl is a real risk. The whole model needs **three nouns, two link
kinds, and one tag** — nothing more.

| Word | Is |
| --- | --- |
| **node** | one markdown file: frontmatter + body |
| **link** | a typed pointer from one node to another |
| **incarnation** | an optional tag on a node (`email`, `voice`, `any`, …) — the form the intent takes; gather filters by it via `--as` |

> Naming: this tag was called *medium* through early notes. Settled name is
> **`incarnation`** (field) with **`--as`** (gather flag): the fingerprint is
> disembodied intent; a tagged node is that intent incarnated in one output.
> Voice-safe (unlike render/form/look) and free of "medium"'s abstractness.

Links come in two kinds:

- **`under`** — containment. Builds the tree; drives the cascade (a node inherits
  from everything it sits under).
- **`relates`** — lateral composition (reinforces / contrasts / is-a-variant-of).
  The flavor lives in prose or an optional qualifier, not as separate link types.

**Refused, on purpose:**

- *spine / backbone / envelope* — not objects. The "spine" is just the `under`
  links; the "envelope" is just frontmatter. We use the plain words.
- *the `projects` edge* — collapsed away. A medium-specific expression is just a
  **child node tagged with a `medium`** — i.e. `under` + a `medium` tag. One
  mechanism, not two. No special projection edge.
- *a big edge vocabulary* — start with `under` and `relates` only. `governs`
  (stances) is deferred until the runtime/voice scenario (D) is real.
- *intent / inventory / composition as types* — they are how the body is written
  and read (guidance), never frontmatter types.

## The Ghost-native extension

One thing the OKF-family substrate lacks and we add: the **`medium` tag.**

A node is either medium-agnostic (`medium: any` or omitted → cascades everywhere)
or medium-bound (`web`, `email`, `billboard`, `slide`, `voice`,
`generated-screen`, …). A contract declares whether medium matters at all
(single-medium products pay no medium tax — they never write `medium`).

The "one brand, every medium" power — consistent yet varied, and traceable — is
not a new link type. It is just: shared intent lives in a parent node; each
medium-bound child sits `under` it and carries its own `medium`. The cascade
gives consistency; the child + tag gives the per-medium expression; the `under`
link gives traceability back to intent.

## Scenarios that stress-tested the shape

Drafted in full in chat; summarized here for the lessons they forced.

- **A — simple dashboard.** The model must be near-invisible at small scale:
  optional `medium`, a ~6-line tree. The first real payoff is a `relates` link
  encoding a *considered exception* (item-detail bends the global density rule on
  purpose).
- **B — monorepo, 3 products, shared visuals.** "One contract per package"
  (one-road) is correct but incomplete: it needs a **cross-package ref grammar**
  (`package#ref`) so siblings share brand DNA via an installed brand contract,
  not copy-paste. Also: product / section / page are **one recursive node** at
  different depths, not distinct kinds.
- **C — marketing (email, flyer, billboard, slides).** "A node = a place" dies; a
  node is a *bounded intent* that may render into zero screens. The `medium` tag
  becomes the heart of the value. Checks become **medium-conditional**.
- **D — generative voice-first super app.** The contract's job inverts: from
  *describing* nodes to **governing generation at runtime**. Nodes become
  *classes* the runtime instantiates. Would need a **`governs` link** (deferred)
  for conditional decision rules, a **runtime check mode**, and the generation
  trigger generalizes from "user prompt" to "any trigger, human or system."
- **E — all of the above are one brand (the superset).** The root is the brand
  soul and **must be medium-agnostic**, or consistency collapses. The cascade +
  medium tag is the unifying mechanism across A–D. E is realistically a *fleet
  with a shared root* — proving the **cross-package ref grammar is mandatory, not
  optional**. `compare`/`drift` find their highest purpose: coherence across the
  children of one intent ("has marketing voice drifted from product voice?").

## The schema it conforms to

Derived from the scenarios, kept to the minimal vocabulary above: nodes, two
link kinds (`under` / `relates`), and an optional `medium` tag. The substrate is
OKF-family; the `medium` tag is ours.

### A node

```yaml
---
# REQUIRED (the conformance minimum)
id: core/trust              # unique, addressable

# OPTIONAL (defaults keep small scale invisible)
under: core                 # parent node — builds the tree, drives the cascade
                            #   (omitted at the root)
relates: [checkout/payment] # lateral links (optional)
medium: any                 # omit or `any` = applies everywhere; else web/email/
                            #   billboard/slide/voice/generated-screen/…
---
Prose body. The guidance. Intent / inventory / composition are how it is
written and read, not fields.
```

**A node is valid iff** it has an `id`, parses (frontmatter + body), and every
`under` / `relates` target resolves. Everything else defaults. The tree is the
set of `under` links — there is no separate spine object.

### Naming a node (refs)

```
<ref>          ::= <name> ("/" <name>)*          # core/trust
<package-ref>  ::= <package> "#" <ref>           # @acme/brand#core/trust
```

In-context the package prefix is omitted. `@acme/brand#core/trust` reaches a
node in an installed brand contract — how a brand spans repos/teams/cadences
without merge or stacks. Dangling refs are a lint error.

### Checks

A check is a node whose body is an assertion (the existing `ghost.check/v1`
form). It uses the same `under` (routing) and optional `medium` (when the
assertion is medium-specific).

```yaml
---
id: checks/billboard-brevity
under: marketing            # applies to this node and everything under it
medium: billboard           # only fires for the billboard medium
---
≤ 6 words. Readable at 70mph. (agent-evaluated)
```

### Manifest (the defaults-that-extend seam)

```yaml
package: "@acme/product"    # this contract's id (for cross-package refs)
medium: web                 # default medium for nodes that omit it; omit if N/A
consumes: ["@acme/brand"]   # installed brand/sibling contracts
```

### The whole thing in one frame

```
CONTRACT
├── manifest   package, medium (default), consumes
└── nodes      markdown files: { id, under?, relates?, medium? } + prose body
               · the tree   = the `under` links
               · cascade    = inherit from everything you're under
               · medium      = optional tag; absent = applies everywhere
               · checks      = nodes whose body is an assertion
```

**Three invariants make it gatherable** (format-free — the real spec):

1. **Identity** — every node has an `id`.
2. **Resolvable links** — every `under` / `relates` target resolves (local or
   `package#ref`); the union folds losslessly into one graph.
3. **One root** — exactly one node with no `under` (the brand soul), and it is
   medium-agnostic.

Everything else — file names, dirs, one-file-vs-many — is a **free projection**
over this.

## Open questions

1. **The rename.** "Surface" now means screen (A), product (B), message (C), and
   class (D) at once. The unit wants one medium- and instance-agnostic name:
   **node** (or **interaction**), with "surface" dropped or demoted to "a
   web-medium node." E forces this.
2. **Is `medium` ever multi-valued?** D suggests a voice turn that also summons a
   screen. Leaning single-valued to start; revisit only if D becomes real.
3. **Runtime consumption.** D needs the packet compact and machine-actionable
   enough to inject into a live generation loop (latency, token budget). A new
   requirement the current authoring-time framing does not contemplate.
4. **Cross-package ref resolution.** The `package#ref` grammar is mandatory
   (B, E) but unspecified: how are `consumes` packages located and version-pinned?
5. **How loose is conformance allowed to be?** Pure invariants (lint is the only
   guardrail) vs. recommended-shape-with-escape-hatches. Leaning the latter
   (pragmatic): ship templates/defaults, tolerate deviation that holds the three
   invariants. (The Style-Dictionary lesson: easy defaults, deep customization,
   stable contract.)

## Read-back

This note is right if it establishes that the model is a **curated, opinionated
context graph queried by traversal**, not a file/bucket layout; that the
substrate (markdown + frontmatter folding into a graph) is an OKF-family
convergence we adopt; that our deliberate divergences from OKF — **typed links
(`under` / `relates`) and the `medium` tag** — are precisely our value; that
`intent`/`inventory`/`composition` are how the body is written, not types; that
the whole vocabulary is **three nouns (node, link, medium), two link kinds, one
tag**; and that the schema above is one projection of a model defined by three
invariants (identity, resolvable links, one medium-agnostic root).
