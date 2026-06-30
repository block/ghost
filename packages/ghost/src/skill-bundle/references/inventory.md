---
name: inventory
description: Author the inventory lens well so an agent can match a fingerprint's intent to concrete materials.
handoffs:
  - label: List the node menu
    command: ghost gather
    prompt: What materials does this fingerprint document, and what is absent?
  - label: Compose a surface slice
    command: ghost gather <surface>
    prompt: Gather the inventory an agent would match against for this surface.
---

# Recipe: Author the Inventory Lens

**Goal:** when you are documenting the **materials** a surface draws from, write
that prose so an agent can translate the fingerprint's intent into concrete
building blocks without the fingerprint ever naming a component.

This is opinionated method, not new schema. Intent / inventory / composition are
**authoring lenses**: angles for an author to think through while writing a
node's prose body. They live in that prose; the frontmatter still holds the
fields, so a lens is never a frontmatter key, a node type, or a section that
must coexist with the others in one node. A node may lean entirely on
one lens: a pure-inventory node is fine, just as a pure-intent node is. Inventory
can be one paragraph inside a broader node, or it can be split across many
nodes, one per block grouped under a surface, whatever keeps each node
purpose-coherent. Everything here is guidance for writing inventory prose well,
wherever it lands. It adds nothing to the artifact: a node is still a markdown
file with `description` / `relates` / `incarnation` frontmatter and a prose body,
placed by its path. See [capture.md](capture.md) for the node shape.

## Where it sits

A fingerprint declares intent in medium-agnostic terms. Inventory grounds that
intent in concrete materials. A realizing surface (an agent emitting web, Arrow,
iOS, …) **reads** the inventory and matches against it; the fingerprint never
references the surface. Strip every inventory node and the fingerprint is still
valid and still portable. It just gives the agent less to draw on. The agent
does the matching.

## Inventory richness is the portability dial

This trade belongs to the author:

- **Abstract inventory** (principles, arrangement, no concrete components) →
  maximally portable. The same fingerprint composes onto web, Arrow, iOS,
  Android.
- **Concrete inventory** (named building blocks, possibly medium-bound) →
  strongly grounded, less portable. Tag medium-bound nodes with `incarnation`;
  leave essence untagged.

Neither is correct. A medium-specific inventory node is a deliberate trade, not
a leak, and it does not contaminate the fingerprint, which still does not
*depend* on it.

## Tier first: not everything earns a node

- **Primitives** (button, input, badge, avatar, spinner, separator, skeleton…)
  get **no prose body**. They are shared vocabulary, not intent; the agent
  already knows what a button is. If you record one at all, give it only a
  `description` so `gather` can surface it; the absence of a body is the signal
  it is a primitive.
- **Anything that encodes a user moment** (confirmation, plan, task, tool,
  reasoning, sources, terminal…) earns **one short prose body**. This is the
  part the method is for.
- The **composer middle** (card, table, form, sidebar…) is a call to weigh, not
  a third tier. Give it a body when its arrangement carries intent worth
  matching; lean on "not when" to separate it from neighbors.

If a primitive ever seems to need intent guidance, that is a signal it is doing
a composer's job. Promote the pattern into a node; do not write a body on the
primitive.

## The shape of an inventory node

A node placed by its path, like any other (e.g. `inventory/confirmation.md` →
id `inventory/confirmation`, parent `inventory`). Frontmatter carries only the
real reserved keys; the body is prose the agent reasons over.

**Frontmatter:**

- **`description`**: the retrieval payload. This is how `gather` and search
  find the node, so write one on every block worth matching.
- **`relates`**: link the nearest rivals here (`as: contrasts`). This is the
  "see-also" set, and it is the real graph edge, so `ghost validate` checks it
  resolves and `ghost gather` unfolds it. Do **not** invent a parallel `name` or
  `see-also` field; identity comes from the path and links come from `relates`.

**Body:** one short paragraph in a consistent rhythm, *for / reach when / not
when (use X instead) / never*:

- **for**: the user need or moment it exists for, framed as the problem, not
  the widget.
- **reach when**: phrased as the user's *first question* ("who/what is this?"
  vs "what's happening / what do I do?"). First-question framing forces a clean
  pick between overlapping blocks; situation framing lets both claim a match.
- **not when**: name the rival node to reach for instead. This is the prose
  echo of a `relates` edge and makes the set navigable.
- **never**: what it must not be conscripted into, so the agent does not
  stretch it to fit and misleading associations get caught.

Keep appearance, props, tokens, and code out; those are API reference, not
inventory prose. The body stays medium-agnostic; the implementation beneath it
is swappable.

## How a match runs

The agent reads the fingerprint's intent, `gather`s candidate inventory nodes
and ranks them by description, separates near-neighbors on *not when* and
*never*, and assembles. The realizing surface authors the chosen blocks in its
medium. The fingerprint never named a component; the surface never decided the
shape; the agent bridged via documented purpose.

## Curation rule

A block earns its node when its purpose is **distinguishable** from every
other's. Two blocks may overlap heavily and still be distinct *as long as their
"reach when" answers a different first question*. If they answer the same first
question, they are one node with a variant, not two. (When the rationale for the
split is itself rich, write a relationship node whose body explains the tension;
see [capture.md](capture.md).)

## Worked example: an inventory surface

A concrete, less-portable, more-grounded inventory might live under an
`inventory/` surface. Most primitives get no body. A few user-moment nodes,
written in the rhythm:

`inventory/confirmation.md`

```markdown
---
description: Gate a consequential action behind explicit user approval.
relates:
  - to: inventory/tool
    as: contrasts
  - to: inventory/plan
    as: contrasts
---
Gates a tool action behind explicit user approval. Reach for it when the user's
first question is "do I allow this?", when a consequential action needs a human
decision before it runs. Not when the action is already complete (that's
`inventory/tool`) or when no decision is required. It is never a status display;
with no decision to make, it only manufactures friction.
```

`inventory/chain-of-thought.md`

```markdown
---
description: Reveal an agent's intermediate reasoning as a collapsible trail.
relates:
  - to: inventory/reasoning
    as: contrasts
  - to: inventory/task
    as: contrasts
---
Reveals an agent's intermediate reasoning as a progressive, collapsible trail.
Reach for it when the user's first question is "how did it get here?", when the
process is the content. Not when you want final explanation prose (that's
`inventory/reasoning`) or a checklist of work (that's `inventory/plan` or
`inventory/task`). It is never a to-do list or a final answer; it is process
disclosure.
```

`inventory/task.md`

```markdown
---
description: Track discrete units of work and their live status during execution.
relates:
  - to: inventory/plan
    as: contrasts
  - to: inventory/chain-of-thought
    as: contrasts
---
Tracks discrete units of work and their live status as the agent executes. Reach
for it when the user's first question is "what's happening right now?" Not when
the steps are a forward proposal not yet started (that's `inventory/plan`) or the
content is reasoning rather than work (that's `inventory/chain-of-thought`). It
never reports a proposal or a rationale, only work in flight.
```

`inventory/table.md`

```markdown
---
description: Present many records across shared, comparable columns.
relates:
  - to: inventory/card
    as: contrasts
---
Presents many records across shared, comparable columns. Reach for it when the
user's first question is "how do these compare across the same attributes?" Not
when each item needs rich, non-uniform presentation (use repeated `inventory/card`)
or there is a single subject rather than a collection. It is never a single
record's detail view.
```

`inventory/button.md`

```markdown
---
description: A primitive action trigger.
---
```

(A primitive: a `description` so `gather` can surface it, no body. The agent
already knows what a button is.)

## Reuse vs. free-compose

A realizing surface may target a different medium than the one your inventory
was drawn from. So do not pin inventory by prop or markup shape. Document the
*purpose* and any *guarantees* a block must hold (an action routes through a
declared tool, a control is keyboard-reachable). Let the surface author the
form. Pinning prop APIs re-imports medium-specific opinion and creates a mirror
to maintain. Where a block's expression really is bound to one medium, say so
with `incarnation` rather than by smuggling markup into the prose.

## Never

- Never invent `name` or `see-also` frontmatter; identity is the path and links
  are `relates`.
- Never write a prose body on a primitive; the absence of a body is the signal.
- Never put props, tokens, or markup in an inventory body; that is API
  reference, not purpose.
- Never let the fingerprint reference the realizing surface; inventory is read,
  not addressed.
- Never split two blocks that answer the same first question; that is one node
  with a variant.
