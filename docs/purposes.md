# Architecture: What Fingerprints Are For

> **Audience: Ghost maintainers and contributors.** This is the internal model
> doc — it defends the boundary between the fingerprint artifact and the
> consumers that read it. It is not an onboarding guide and it assumes the full
> vocabulary (projection, leak, corpus, glossary). If you are adopting Ghost,
> start with [Five-Minute Ghost](../apps/docs/src/content/docs/quickstart.mdx)
> and [Getting Started](../apps/docs/src/content/docs/getting-started.mdx)
> instead; come back here when you want to change the model, not use it.

Ghost has one artifact, the `.ghost/` fingerprint package, and several consumers
that read it. This page exists to keep them honest.

## The rule

> A consumer may read the fingerprint through any **projection** it likes.
> A consumer may **not** change the shape of the fingerprint to suit itself.

The fingerprint is a deliberately dumb source of truth. It does not know who is
asking. Every purpose lives in the projection, not in the artifact.

The test for any feature that "feels bundled":

> Does serving this purpose require changing the *shape* of the fingerprint: the
> flat corpus, the node frontmatter, the filename-kind convention, or the
> glossary?
> - **No** then it is a projection. Fine. Keep it out of the model.
> - **Yes** then that is a leak. Write it down below and fix the boundary.

## The model (does not bend)

The package is a **flat corpus of prose nodes**. A node is a markdown file, its
id is its filename with `.md` dropped (`principle.density.md` is
`principle.density`), its kind is the filename prefix before the first dot, and
a bare name (`voice.md`) is uncategorized. The glossary declares the category
vocabulary. No file declares a graph, because there is no graph: no hierarchy,
no inheritance, no edges. Nesting into folders is a browsing convenience only.

| Part | Job |
| --- | --- |
| `manifest.yml` | Schema version, package id, and the optional `plugins` list declaring which reserved subtrees the package uses — the package's only anchor. |
| `glossary.md` | The author's dictionary: every term with defined meaning in the corpus, including terms carried by a single bare node. Ghost ships no fixed vocabulary. |
| `haunt/` | **Reserved subtree** — the adherence plugin's repo-local data (inventory + checks). Never a node source. `gather` serves its inventory as **materials** (building blocks for generation, listed after the truths) and never serves its checks. |
| Prose nodes (`<kind>.<slug>.md`, `<slug>.md`) | The durable brand truths, written through three authoring **lenses**: intent (the why), inventory (the materials), composition (the patterns). The lenses guide what to capture; they are not fields. Altitude lives in the prose: a narrower truth names its **condition** — the situation it applies in, never a filing destination. |
| Node frontmatter | `description` (the retrieval payload — the one-liner `gather` puts in the menu). |

One resolution mechanism, read-only:

- **The menu.** `gather` emits every node's id, kind, and description — the
  whole corpus, flat — followed by the haunt inventory as a distinct
  materials section when the plugin is present. The agent reads the ask
  against the descriptions and pulls the truths and materials it judges
  relevant. Ghost does no NLP and no selection.

The entrypoint node is `index.md` (id `index`, one uniform rule: id = path
minus `.md`): the **human-curated front door** — what this fingerprint is,
how its kinds organize, what to read first. It is an ordinary node, listed
in the menu like any other; its curation is an author's job, never a
generated listing.

Checks are **not** nodes and are **never gathered**. They live in the
reserved `haunt/` subtree — Haunt is a plugin that piggybacks on the
fingerprint package, anchored by the fingerprint's own manifest — and bind
to the prose they enforce via `references`. The feed-forward/feed-back seam
runs through the plugin itself: inventory grounds generation, checks grade
output.

Two rules keep the reservation honest:

- **The reserved list is closed.** `manifest.yml`, `glossary.md`, `haunt/`.
  A new entry must pass the shape-test above and ships only with a new
  fingerprint schema version — a tool that wants a home inside `.ghost/` has
  to amend the constitution, not just claim a directory. The manifest's
  `plugins` list declares which reserved subtrees a package actually uses;
  `validate` warns when a subtree is present but undeclared.
- **Reserved subtrees never travel.** A fingerprint export — for a fleet
  view, a sibling repo, any consumer outside this repo — is the root nodes
  plus glossary plus manifest. `haunt/` is repo-local by definition (its
  `paths` globs are welded to this tree) and is always left behind.

## The consumers (each is a projection)

| Consumer | CLI surface | Projection it needs | Reads | Changes the model? |
| --- | --- | --- | --- | --- |
| **Authoring** | `ghost init`, `ghost validate` | The raw nodes, for a human or agent writing the fingerprint. The agent does its own repo reconnaissance. | the corpus | **No**, this *is* the model. |
| **Generation** | `ghost gather` | The flat menu (id + kind + description) plus the haunt materials section; the agent selects the truths and building blocks the task needs and shapes a pre-generation brief. | the menu, then the selected node bodies and material paths | **No** if selection stays with the agent. **Leak risk:** pushing retrieval needs back into the corpus shape. |
| **Adherence** | `haunt review` (private) | The referenced fingerprint node bodies, as the baseline a diff is graded against. Checks bind via `references`. | fingerprint prose, read-only | **No** if checks stay offered-and-grounded in Haunt. **Leak risk:** routing checks by anything other than `references`. |
| **Audit** | `haunt integrity` (private) | The same referenced prose, graded against the whole inventory rather than a diff. | fingerprint prose, read-only | **No**, same boundary as adherence. |
| **Fleet** | (future, private) | Many fingerprints at once: distances, cohorts. | many corpora, read-only | **No**, consumes exports read-only. |

## Known leaks (the `Leak risk` rows, restated)

These are the places where a consumer's need could bend the model. Each is a
thing to fix at the boundary, not a reason to redesign the artifact.

1. **Retrieval needs pushed into the shape.** When selection feels imprecise,
   the temptation is to encode routing in the data: proliferating filename
   kinds until they become destinations, or turning the glossary into a
   dispatch table. Kinds are the author's vocabulary, not a retrieval index.
   *Fix: `description` is the retrieval payload; sharpen descriptions, show the
   menu, let the agent pick.*

2. **Filing by destination.** A truth authored as `for-emails.md` smuggles a
   routing model into the corpus. Conditions belong in the prose as
   *situations* ("when a surface must show many items at once…"), never as
   filename buckets.
   *Fix: condition-authoring craft; the skill's capture recipes enforce it.*

3. **Checks routing by anything other than `references`.** Haunt's checks bind
   to the exact prose they enforce. Filtering or routing checks by kind, by
   folder, or by any corpus-side convention is governance policy leaking into
   the artifact.
   *Fix: keep checks in the `haunt/` subtree, offered-and-grounded, bound via
   `references` only.*

4. **A consumer demanding structure back.** Any consumer that wants edges,
   hierarchy, inheritance, or a precomputed slice is asking the corpus to do
   the model's job. The flat corpus survived precisely because cascade, typed
   edges, and slicing all failed the "does the model do this for free?" test.
   *Fix: the consumer builds its projection at read time; the corpus stays
   flat.*

5. **Undeclared kinds drift silently.** A node named
   `guiding-principles.density.md` when the glossary declares `principle`
   fragments the vocabulary.
   *Fix: `validate` warns on undeclared kind prefixes and suggests the closest
   declared kind (a soft warning, not an error).*

## What we are NOT doing

- **Not** reintroducing a graph: no hierarchy, no inheritance, no cross-node
  edges. The whole value of the flat corpus is that it is dumb and predictable,
  and the model reads it whole.
- **Not** adding a selection engine (ranking, embeddings-as-routing, precomputed
  slices) inside the artifact; the agent selects against descriptions.
- **Not** letting checks become generation input; the haunt subtree lives
  inside `.ghost/`, but the feed-forward/feed-back seam holds — inventory
  grounds building, checks grade output, and review stays Haunt's projection,
  reading the fingerprint read-only.
- **Not** giving any consumer write access to the shape of the corpus.

## One line

The flat corpus is how brand truths are **stored and owned**; the glossary plus
the `gather` menu is how context is **selected**. One model, many projections,
and the model never bends to serve a projection.
