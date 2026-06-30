---
name: capture
description: Author repo-local Ghost fingerprints as nodes.
handoffs:
  - label: Inspect the package
    command: ghost scan
    prompt: What does this fingerprint package contribute, and what is absent?
  - label: Run advisory review
    command: ghost review
    prompt: Run ghost review against this bundle
---

# Recipe: Author Ghost Fingerprint

**Goal:** record durable product-surface composition in `.ghost/` as a graph of
prose **nodes**. If a change is uncommitted or unmerged, it is draft work. If it
is checked in, Ghost treats the fingerprint package as canonical.

```text
.ghost/
  manifest.yml          # schema + id
  index.md              # the core node, true everywhere
  checkout/             # a surface is a directory
    index.md            #   the checkout surface's own prose
    trust.md            #   a node placed under checkout
  checks/               # optional ghost.check/v1 markdown checks
```

A **node** is a markdown file: YAML frontmatter (descriptive properties) + a
prose body (the design expression). The **directory tree is the graph**: a
node's id is its path, its parent is its containing directory, and a surface is
just a directory whose own prose lives in its `index.md`. `ghost gather
<surface>` traverses it.

## The node shape

A node at `checkout/trust.md` (id `checkout/trust`, parent `checkout`):

```markdown
---
description: Trust at the payment moment.  # the retrieval payload (see below)
relates:                    # optional: lateral links
  - to: core/trust
    as: reinforces          # reinforces | contrasts | variant
incarnation: web            # optional: email | billboard | voice | … (omit = essence)
# free-form keys (audience, stage, …) are allowed and pass through untouched
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness…
```

- **`description`** is how an agent finds the node: a one-line "what this is and
  when to gather it," exactly like a tool's name + description. `ghost gather`
  with no argument lists nodes by id + description; the agent matches the ask
  against those and names one. The body is the node's "implementation"; the
  description is what makes it discoverable. Write one on any node worth
  anchoring a task at.
- **The directory places the node.** A node inherits every file in the folders
  above it, up to the root; a sibling folder is invisible. The brand soul lives
  in the package-root files
  (the `core` node and other root files), so it reaches every surface. Author a
  broad rule at the broadest folder where it is true: a feature's
  `invariants.md` reaches every screen in that feature and nowhere else.
- **`relates`** links laterally when a relationship carries rationale. When the
  rationale is rich (e.g. "checkout and item-detail disagree on density on
  purpose"), write a **relationship node** whose body explains the tension.
- **`incarnation`** tags a node only when its expression is bound to one output
  form. Leave medium-agnostic essence untagged.

## Write the body through three lenses

Intent / inventory / composition are **authoring lenses**: angles you think
through as you write a node's prose body (the part below the `---` in the
example above). They live in that prose, while the frontmatter holds the fields
— so a lens is never a frontmatter key or a separate node type, and a node may
lean entirely on one:

- **intent**: the why and the stance.
- **inventory**: the material you have (tokens, components, and pointers to the
  actual implementation in code).
- **composition**: how it is assembled (the patterns that make it intentional).

A finding cites a node by id, so keep a node **purpose-coherent**: one purpose,
any length. Split into a second node only when a handle diverges, say a different
directory (parent), a different `incarnation`, or a genuinely different
`relates` role.

## Steps

### 1. Classify the authoring scenario

Decide which posture fits the repo before scaffolding. Follow
[authoring-scenarios.md](authoring-scenarios.md) when setting up or substantially
revising a fingerprint. Human intent anchors composition; scans provide
evidence; agent synthesis is draft work until a human curates it and Git review
accepts it.

Monorepos and product suites run **one contract per package**: surfaces are how
a single contract organizes locality.

### 2. Initialize

```bash
ghost init            # scaffolds manifest + a core index.md node
ghost scan
```

`ghost init` is template-driven (`--template <name>` selects a starter). The
default template seeds the package-root `index.md` (the `core` node),
demonstrating the shape.

### 3. Shape the tree

Add a surface by adding a directory: `checkout/` is the `checkout` surface, and
`checkout/index.md` holds its prose. Nest surfaces by nesting directories. The
tree is the layout itself; a node's id and parent come from where its file
sits, never from a separate declaration.

### 4. Orient

Read the product, not just the component library. Look for surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal hierarchy,
behavior, copy, accessibility, trust, and flow. `ghost signals .` emits raw
scratch observations; curate, never copy verbatim into a node.

### 5. Write sparse nodes

Add the smallest useful set of nodes, each a purpose-coherent prose body
written through the lenses, placed by putting its file in the right directory
and linked with `relates` where a relationship carries meaning. Prefer a few
high-confidence nodes over a noisy
catalog. Ask the human to keep, soften, reject, or re-place important claims
before treating draft nodes as durable.

### 6. Add checks sparingly

`checks/*.md` are `ghost.check/v1` markdown. Each may carry an optional
`source:` pointer (a node id with an optional `> Heading`) binding it to the
prose it enforces; every check is offered and the agent judges which apply.
They validate output after generation; they are not generation input. Add only
deterministic checks.

### 7. Validate

```bash
ghost validate .ghost
ghost review --base HEAD
```

## Never

- Never describe any file outside `.ghost/` as canonical package input.
- Never treat raw `ghost signals` output as a node without curation.
- Never invent surface-composition obligations absent from evidence or human
  direction.
- Never promote subjective taste directly into checks; make it deterministic or
  keep it advisory.
