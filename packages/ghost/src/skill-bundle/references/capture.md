---
name: capture
description: Author repo-local Ghost brand fingerprints as a flat set of prose nodes.
handoffs:
  - label: Inspect the package
    command: ghost validate
    prompt: Does this fingerprint package validate, and what is absent?
---

# Recipe: Author Ghost Fingerprint

**Goal:** record durable brand truths in `.ghost/` as a flat set of prose
**nodes**. If a change is uncommitted, it is draft work. If it is checked in,
Ghost treats the fingerprint package as canonical.

```text
.ghost/
  manifest.yml          # schema + id
  glossary.md           # the kind vocabulary + what each kind means
  principle.trust.md    # a brand truth of kind `principle`
  condition.density.md  # a brand truth of kind `condition`
  voice.md              # a brand truth without a kind
```

A **node** is a markdown file: a `description` in frontmatter + a prose body (the
brand truth). The package is **flat** — no hierarchy, no inheritance, no edges. A
node's kind comes from its filename prefix; the glossary declares the kinds.

## The node shape

A node at `principle.trust.md` (id `principle.trust`, kind `principle`):

```markdown
---
description: Trust at the payment moment.  # the retrieval payload (see below)
# free-form keys (audience, stage, …) are allowed and pass through untouched
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness…
```

- **`description`** is how an agent finds the node: a one-line "what this is and
  when to gather it," exactly like a tool's name + description. `ghost gather`
  emits the menu of id + kind + description; the agent matches the ask against
  those. Write one on every node.
- **Kind is the filename prefix** and must be a kind the glossary declares. A
  bare name (`voice.md`) has no kind — fine.
- **Altitude lives in the prose.** State a universal truth plainly; give a
  narrower truth its **condition** — the *situation* it applies in — in the prose.
  Never file a truth by destination (`for-emails.md`); the model reads the
  condition and decides when it applies.

## Write the body through three lenses

Intent / inventory / composition are **authoring lenses**: angles you think
through as you write a node's prose body. They live in that prose, never as
frontmatter keys or node types, and a node may lean entirely on one:

- **intent**: the why and the stance.
- **inventory**: the material you have (tokens, components, and pointers to the
  actual implementation in code).
- **composition**: how it is assembled (the patterns that make it intentional).

Keep a node **purpose-coherent**: one truth, any length. Split into a second node
only when it is genuinely a different truth.

## Encode in the strongest form that fixes the failure

A node's body is prose, but prose is not always description. Match the encoding
to the gap you are closing:

| The agent keeps… | Encode as | Why |
| --- | --- | --- |
| inventing values it can't know (colors, type, spacing, component names) | explicit values in the body + `materials` locators | knowledge gap — no stance compensates for a missing token |
| producing generic form (tone, rhythm, layout, density) | a **verbatim sample** in the body | models match shown form far better than described form |
| crossing hard lines | **never/always invariants** with concrete objects | specific negations get the highest compliance of any prose |
| misreading novel situations | stance prose | the interpretive frame for everything the above don't cover |

A node body may *be* a sample. When the human shows you copy they love, a
screenshot of the product at its best, or an interaction that "feels like us,"
capture it verbatim (or point `materials` at it) and annotate what makes it
theirs — do not summarize it away into adjectives. A real on-brand error message
out-steers a paragraph about the error-message voice.

`exemplar.error-voice.md`:

```markdown
---
description: A verbatim on-brand error message — the voice at failure moments.
---

Normative for rhythm and stance at failure moments; match its form, not its words.

> We couldn't save your changes. Your work is still here — try again, and if it
> keeps failing, we'll hold onto everything while you sort it out.

What makes it ours: leads with what happened, not with apology. States what is
safe before what to do. One calm next step. No "Oops," no exclamation points,
no blame on the user or the network.
```

The annotation ("what makes it ours") is the load-bearing part: a bare sample
teaches form, the annotation teaches *which features of the form are
intentional*, which stops an agent from copying incidental details.

Counter-exemplars deserve the same first-class treatment. Escaping a generic
default requires the generic thing to be *named and rejected*, not just the
target described — "not bootstrap-blue, not rounded-xl cards on gray-50"
collapses the prior that "use our distinctive palette" leaves intact.

`anti-goal.generic-ui.md`:

```markdown
---
description: The default AI-generated aesthetic we reject — read before building any UI.
---

We are not the generic generated interface: no bootstrap-blue or indigo-600
primaries, no rounded-xl cards floating on gray-50, no emoji in headings, no
gradient hero text, no "Oops!" copy. When a layout feels like a template that
any product could ship, it is off-brand even if every token is right. Our
defaults when in doubt: flat surfaces, hard alignment to the grid, one accent
used sparingly.
```

Every never/always line in the fingerprint is also a candidate **check** — a
check is an invariant made reviewable (see the checks haunt).

## Author through steering jobs

The steering buckets are mandatory questions, not mandatory fields. Do not fill
every bucket on every node. Encode the truth in the strongest form that fixes the
observed failure.

| If the agent keeps... | Author... |
| --- | --- |
| missing the truth | sharper `description` / `index` mention |
| inventing values | `asset.*` node with materials and exact names |
| producing generic output | `anti-goal.*` plus annotated `exemplar.*` |
| choosing the wrong structure | `pattern.*` with bound/open |
| crossing hard lines | invariant prose plus a check |
| applying guidance too broadly | condition in prose |
| making bad tradeoffs | `decision.*` trace |
| producing correct but forgettable work | scoped `concept.*` |

Ask while authoring:

- What generic output would an agent probably produce?
- What does this brand refuse?
- What real material should the agent inspect?
- What should be copied from this exemplar, and what is incidental?
- What is bound, and what is open?
- What hard line would you block in review?
- What decision almost went the other way?
- When would this guidance reverse?

## Steps

### 1. Classify the authoring scenario

Decide which posture fits before scaffolding. Follow
[authoring-scenarios.md](authoring-scenarios.md) when setting up or substantially
revising a fingerprint. Human intent anchors the truths; what the human says and
shows — words, images, links, exemplars — is the evidence; agent synthesis is
draft work until a human curates it and Git review accepts it.

Monorepos and product suites run **one contract per package**.

### 2. Initialize

```bash
ghost init            # scaffolds the steering starter
ghost validate
```

`ghost init` seeds the steering starter: the manifest, a starter `glossary.md`
(with suggested kinds you keep, rename, or replace), the package-root
`index.md` (id `index`), and demo nodes for stance, composition, anti-goals,
patterns, exemplars, materials, and decisions. The demo content is there for
inspiration and guidance. Replace its claims, paths, examples, and decisions
with real product truth before using it to steer generation. Use
`ghost init --template minimal` when you only want the small
manifest/glossary/index starter. Write `index.md` as the human-curated
front door: the non-negotiables that apply to every task (stated briefly,
linking to full nodes by id for depth), what this fingerprint covers, how its
kinds organize the corpus, and any stricter silence posture. It is an ordinary
node mechanically, but by convention agents always pull it first — anything
that must never be missed belongs here.

Nodes may carry a `materials` list in frontmatter: repo-relative paths/globs or HTTPS URLs for the concrete materials the prose governs. Bundle brand-owned materials, reference implementations: put brand-owned materials that should survive export or refactors (tokens.css, motion.json, logo.svg, type materials) under `materials/`; point at living app code where the implementation itself should stay in place. Optional capabilities (haunts) live under `.ghost/haunts/` — e.g. the checks haunt (`ghost haunt add checks`) — and are feed-back only; they are never gathered.

### 3. Shape the glossary

Declare the kinds you will use in `glossary.md` — the frontmatter
`kinds` list plus a `#` section per kind explaining its meaning and
normative weight. Kinds are your choice; Ghost ships no fixed vocabulary. A
node's filename prefix must match a declared kind (or the node has no kind).

The glossary is a dictionary of every term with defined meaning in the corpus —
including a term currently used by only a bare node. A root `voice.md` with a
`voice` glossary entry declares the scope for future `voice.<slug>.md` nodes;
declaring a kind with zero or one users is good hygiene, not
over-structure.

### 4. Orient

Elicit the brand from the human, not from a codebase. Interview for stance,
audience, and anti-goals; ask for the material they can show — screenshots,
links, exemplar products, brand docs, copy they love or hate. Treat every
artifact as testimony to curate, never truth to copy verbatim. Repo-bound
reality (components, paths, building blocks) can be recorded as `materials` on the node whose prose explains their purpose.

### 5. Write sparse nodes

Add the smallest useful set of nodes, each a purpose-coherent prose truth written
through the lenses, named `<kind>.<slug>.md` (or a bare slug when no kind is present).
Draft only what the human said or showed. State conditions as situations in the
prose. Prefer a few high-confidence truths over a noisy catalog. Ask the human
to keep, soften, reject, or re-title important claims before treating draft
nodes as durable.

### 6. Validate

```bash
ghost validate .ghost
```

`validate` checks artifact shape, per-node validity, and that each node's kind
prefix is a declared glossary kind (an undeclared prefix is a warning with a
"did you mean" suggestion, not a failure).

## Never

- Never describe any file outside `.ghost/` as canonical package input.
- Never derive a brand truth from repo code alone; what a codebase repeats may be legacy, not stance. Use repo paths as `materials` only when the prose truth has been curated.
- Never draft a node the human neither said nor showed.
- Never invent a hierarchy, inheritance, or cross-node edges — the package is
  flat.
- Never file a truth by destination; state its condition in the prose.
