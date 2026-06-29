---
name: capture
description: Author repo-local Ghost fingerprints as nodes.
handoffs:
  - label: Inspect the package
    command: ghost scan
    prompt: What does this fingerprint package contribute, and what is absent?
  - label: Run deterministic checks
    command: ghost check
    prompt: Run ghost check against this bundle
---

# Recipe: Author Ghost Fingerprint

**Goal:** record durable product-surface composition in `.ghost/` as a graph of
prose **nodes**. If a change is uncommitted or unmerged, it is draft work. If it
is checked in, Ghost treats the fingerprint package as canonical.

```text
.ghost/
  manifest.yml      # schema + id
  surfaces.yml      # the spine: surfaces + their `parent` (core is implicit)
  nodes/            # one prose node per file
    core-voice.md
    checkout-trust.md
  checks/           # optional ghost.check/v1 markdown checks
```

A **node** is a markdown file: YAML frontmatter (the machine handles) + a prose
body (the design expression). The fingerprint is the graph of nodes the loader
folds together; `ghost gather <surface>` traverses it.

## The node shape

```markdown
---
id: checkout-trust          # required: unique, stable
under: checkout             # optional: parent surface/node — inherited downward
relates:                    # optional: lateral links
  - to: core-trust
    as: reinforces          # reinforces | contrasts | variant
incarnation: web            # optional: email | billboard | voice | … (omit = essence)
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness…
```

- **`under`** places the node — a node inherits everything it sits under. The
  brand soul lives at `core` (implicit root), so `core`-placed nodes reach every
  surface.
- **`relates`** links laterally when a relationship carries rationale. When the
  rationale is rich (e.g. "checkout and item-detail disagree on density on
  purpose"), write a **relationship node** whose body explains the tension.
- **`incarnation`** tags a node only when its expression is bound to one output
  form. Leave medium-agnostic essence untagged.

## Write the body through three lenses

Intent / inventory / composition are **authoring lenses**, not fields and not
node types. They are the things worth thinking through as you write a node's
prose — a node may lean entirely on one:

- **intent** — the why and the stance.
- **inventory** — the material you have (tokens, components, and pointers to the
  actual implementation in code).
- **composition** — how it is assembled (the patterns that make it intentional).

A finding cites a node by id, so keep a node **purpose-coherent**: one purpose,
any length. Split into a second node only when a handle diverges — a different
`under`, a different `incarnation`, or a genuinely different `relates` role.

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
ghost init            # scaffolds manifest + surfaces.yml + a seed node
ghost scan
```

`ghost init` is template-driven (`--template <name>` selects a starter). The
default template seeds the spine plus one `core` node demonstrating the shape.

### 3. Shape the spine

Edit `surfaces.yml` to declare the surfaces this product has and their `parent`
(containment). `core` is implicit. The tree is always declared here — never
inferred from node filenames or repo paths.

### 4. Orient

Read the product, not just the component library. Look for surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal hierarchy,
behavior, copy, accessibility, trust, and flow. `ghost signals .` emits raw
scratch observations — curate, never copy verbatim into a node.

### 5. Write sparse nodes

Add the smallest useful set of `nodes/*.md`, each a purpose-coherent prose body
written through the lenses, placed with `under` and linked with `relates` where
a relationship carries meaning. Prefer a few high-confidence nodes over a noisy
catalog. Ask the human to keep, soften, reject, or re-place important claims
before treating draft nodes as durable.

### 6. Add checks sparingly

`checks/*.md` are `ghost.check/v1` markdown, placed by `surface:` frontmatter
(unplaced = core = everywhere). They validate output after generation; they are
not generation input. Add only deterministic checks.

### 7. Validate

```bash
ghost validate .ghost
ghost check --base HEAD
```

## Never

- Never describe any file outside `.ghost/` as canonical package input.
- Never treat raw `ghost signals` output as a node without curation.
- Never infer the surface tree from filenames or repo paths — declare it in
  `surfaces.yml`.
- Never invent surface-composition obligations absent from evidence or human
  direction.
- Never promote subjective taste directly into checks; make it deterministic or
  keep it advisory.
