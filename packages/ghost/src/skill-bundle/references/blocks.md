---
name: blocks
description: Author block and material nodes so an agent can match a fingerprint's stance to concrete building blocks.
handoffs:
  - label: List the node menu
    command: ghost gather
    prompt: What materials does this fingerprint document, and what is absent?
---

# Recipe: Author Block And Material Nodes

**Goal:** when you are documenting the **materials** a brand draws from — its
building blocks, assets, and reusable pieces — write that prose so an agent can
translate the fingerprint's stance into concrete building blocks without the
fingerprint ever naming a component.

This is opinionated method, not new schema. **"Block node" is shorthand in this
recipe, not a Ghost concept**: it means any node whose truth is a reusable
building block, whatever kind the author's glossary declares for it (`block`,
`asset`, `pattern`, …). A block node is a node like any other: a markdown file
with a `description` and a prose body, named `<kind>.<slug>.md` (or a bare
slug). See [capture.md](capture.md) for the node shape. Block prose can be one
paragraph inside a broader node, or split across many nodes, one per block,
whatever keeps each node purpose-coherent.

## Where it sits

A fingerprint declares stance. Block and material nodes ground that stance in
concrete materials — they are what makes a node **concrete** in gather, pull
ordering, and review matching. A realizing agent **reads** them and matches
against them. Strip every block node and the fingerprint is still valid — it
just gives the agent less to draw on, and prose-only steering is weak steering.
The agent does the matching.

## Concreteness is the grounding dial

This trade belongs to the author:

- **Abstract materials** (principles, arrangement, no concrete components) →
  leaves the agent more room, grounds it less.
- **Concrete materials** (named building blocks) → strongly grounds the agent in
  the materials it should reach for, at the cost of that room.

Neither is correct. A concrete block node is a deliberate trade, not a leak.

## Tier first: not everything earns a node

- **Primitives** (button, input, badge, avatar, spinner…) get **no prose body**
  when the generic form serves. They are shared vocabulary, not stance. If you
  record one at all, give it only a `description` so `gather` can surface it;
  the absence of a body is the signal that training priors are acceptable here.
  When a primitive is itself brand-distinctive (a button whose shape, weight, or
  focus treatment is a recognizable brand move), its *divergence from the
  generic form* is a truth worth a body: state what differs and why, not the
  full API.
- **Anything that encodes a user moment** (confirmation, plan, task, tool,
  reasoning, sources…) earns **one short prose body**. This is what the method is
  for.
- The **composer middle** (card, table, form, sidebar…) is a call to weigh. Give
  it a body when its arrangement carries a stance worth matching.

If a primitive ever seems to need stance guidance, that is a signal it is doing
a composer's job. Promote the pattern into a node; do not write a body on the
primitive.

## The shape of a block node

A node like any other. Frontmatter carries `description` (the retrieval payload —
write one on every block worth matching); the body is prose the agent reasons
over.

**Body:** one short paragraph in a consistent rhythm, *for / reach when / not
when (use X instead) / never*:

- **for**: the user need or moment it exists for, framed as the problem, not the
  widget.
- **reach when**: phrased as the user's *first question* ("who/what is this?" vs
  "what's happening / what do I do?"). First-question framing forces a clean pick
  between overlapping blocks.
- **not when**: name the rival node to reach for instead, by its id. This is what
  makes the set navigable — since the package is flat with no edges, the prose
  "not when" *is* the see-also link. Point at the other node's id in the text.
- **never**: what it must not be conscripted into, so the agent does not stretch
  it to fit.

Keep props, markup, and API reference out; the body documents purpose, and the
implementation beneath it is swappable. Explicit values are the exception when
the value itself is the brand truth — an exact color, a specific corner radius —
not a swappable implementation detail.

## How a match runs

The agent reads the fingerprint's stance, `gather`s the menu, ranks candidate
block nodes by description, separates near-neighbors on *not when* and
*never*, and assembles. The realizing surface authors the chosen blocks in its
medium. The fingerprint never named a component; the agent bridged via documented
purpose.

## Curation rule

A block earns its node when its purpose is **distinguishable** from every
other's. Two blocks may overlap heavily and still be distinct *as long as their
"reach when" answers a different first question*. If they answer the same first
question, they are one node, not two.

## Worked example

These examples use a `block` kind. The starter glossary does not ship one, so
declare it (or reuse a declared kind such as `pattern`) before copying the
filenames:

```yaml
kinds:
  - name: block
    purpose: a reusable building block matched by purpose, not named by component
```

`block.confirmation.md` (kind `block`, slug `confirmation`):

```markdown
---
description: Gate a consequential action behind explicit user approval.
---
Gates a tool action behind explicit user approval. Reach for it when the user's
first question is "do I allow this?", when a consequential action needs a human
decision before it runs. Not when the action is already complete (that's
`block.tool`) or when no decision is required. It is never a status display;
with no decision to make, it only manufactures friction.
```

`block.table.md`:

```markdown
---
description: Present many records across shared, comparable columns.
---
Presents many records across shared, comparable columns. Reach for it when the
user's first question is "how do these compare across the same attributes?" Not
when each item needs rich, non-uniform presentation (use repeated `block.card`)
or there is a single subject rather than a collection. It is never a single
record's detail view.
```

`block.button.md`:

```markdown
---
description: A primitive action trigger.
---
```

(A primitive the generic form serves: a `description` so `gather` can surface
it, no body. If this brand's button were itself a recognizable brand move, its
divergence from the generic form would earn a short body.)

## Materials: bundle brand-owned materials, reference implementations

Use the rule of thumb literally. Bundle brand-owned materials: brand-owned artifacts that
should travel with the fingerprint and survive export or refactors — tokens.css,
motion.json, logo.svg, type materials. Reference implementations: living app
code, components, stories, or tests whose home is still the product repo. The
`materials` list locates both; the prose says what the material proves.

## Reuse vs. free-compose

Do not pin a block by prop or markup shape. Document the *purpose* and any
*guarantees* a block must hold (an action routes through a declared tool, a
control is keyboard-reachable). Let the realizing agent author the form. Pinning
prop APIs re-imports implementation opinion and creates a mirror to maintain.

## Never

- Never write a prose body on a primitive the generic form serves; the absence
  of a body is the signal. A brand-distinctive primitive earns a body for its
  divergence, never for its API.
- Never put props, markup, or API reference in a block body; explicit
  values belong only when the value itself is the brand truth.
- Never let the fingerprint reference the realizing surface; blocks are read,
  not addressed.
- Never split two blocks that answer the same first question; that is one node.
