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
  glossary.md           # the category vocabulary + what each category means
  principle.trust.md    # a brand truth of kind `principle`
  condition.density.md  # a brand truth of kind `condition`
  voice.md              # an uncategorized brand truth
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
- **Kind is the filename prefix** and must be a category the glossary declares. A
  bare name (`voice.md`) is uncategorized — fine.
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

## Steps

### 1. Classify the authoring scenario

Decide which posture fits before scaffolding. Follow
[authoring-scenarios.md](authoring-scenarios.md) when setting up or substantially
revising a fingerprint. Human intent anchors the truths; scans provide evidence;
agent synthesis is draft work until a human curates it and Git review accepts it.

Monorepos and product suites run **one contract per package**.

### 2. Initialize

```bash
ghost init            # scaffolds manifest + a starter glossary + a starter index node
ghost validate
```

`ghost init` seeds the manifest, a starter `glossary.md` (with suggested
categories you keep, rename, or replace), and the package-root `index.md`
(id `index`), demonstrating the shape. Write `index.md` as the human-curated
front door: what this fingerprint is, how its kinds organize the corpus, and
what to read first. It is an ordinary node, listed in the menu like any other.

The manifest supports an optional `plugins:` key declaring the reserved plugin
subtrees the package uses (currently only `haunt`); `ghost-haunt init` adds
`plugins: [haunt]` when it scaffolds the adherence subtree, and `ghost
validate` warns when a `haunt/` subtree exists undeclared. When a haunt
inventory exists, `ghost gather` also serves it as a Materials section —
building blocks generation may lean on; checks are feed-back only and are
never gathered.

### 3. Shape the glossary

Declare the categories you will use in `glossary.md` — the frontmatter
`categories` list plus a `#` section per category explaining its meaning and
normative weight. Kinds are your choice; Ghost ships no fixed vocabulary. A
node's filename prefix must match a declared kind (or the node stays
uncategorized).

The glossary is a dictionary of every term with defined meaning in the corpus —
including a term currently used by only a bare node. A root `voice.md` with a
`voice` glossary entry declares the scope for future `voice.<slug>.md` nodes;
declaring a category with zero or one users is good hygiene, not
over-structure.

### 4. Orient

Read the brand and the product, not just the component library. Look for
surfaces, docs, tests, copy, and examples that reveal stance, hierarchy, density,
restraint, repetition, trust, and flow. Read the repo directly (tree, grep,
source inspection) for raw observations; curate, never copy verbatim.

### 5. Write sparse nodes

Add the smallest useful set of nodes, each a purpose-coherent prose truth written
through the lenses, named `<kind>.<slug>.md` (or a bare slug when uncategorized).
State conditions as situations in the prose. Prefer a few high-confidence truths
over a noisy catalog. Ask the human to keep, soften, reject, or re-title
important claims before treating draft nodes as durable.

### 6. Validate

```bash
ghost validate .ghost
```

`validate` checks artifact shape, per-node validity, and that each node's kind
prefix is a declared glossary category (an undeclared prefix is a warning with a
"did you mean" suggestion, not a failure).

## Never

- Never describe any file outside `.ghost/` as canonical package input.
- Never treat raw repo observations as a node without curation.
- Never invent a hierarchy, inheritance, or cross-node edges — the package is
  flat.
- Never file a truth by destination; state its condition in the prose.
