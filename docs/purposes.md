# Architecture: What Fingerprints Are For

> **Audience: Ghost maintainers and contributors.** This is the internal model
> doc. It defends the boundary between the fingerprint artifact and the consumers
> that read it. It is not an onboarding guide and it assumes the full vocabulary
> (projection, leak, corpus, glossary). If you are adopting Ghost, start with
> [Five-Minute Ghost](../apps/docs/src/content/docs/quickstart.mdx) and
> [Getting Started](../apps/docs/src/content/docs/getting-started.mdx) instead.

Ghost has one artifact, the `.ghost/` fingerprint package, and several consumers
that read it. This page exists to keep them honest.

## The rule

> A consumer may read the fingerprint through any **projection** it likes. A
> consumer may **not** change the shape of the fingerprint to suit itself.

The fingerprint is a deliberately dumb source of truth. It does not know who is
asking. Every purpose lives in the projection, not in hidden routing logic.

The test for any feature that "feels bundled":

> Does serving this purpose require changing the *shape* of the fingerprint: the
> flat corpus, node frontmatter, filename-kind convention, checks reservation, or
> glossary?
> - **No** then it is a projection. Fine. Keep it out of the model.
> - **Yes** then that is a leak. Write it down below and fix the boundary.

## The model

The package is a **flat corpus of prose nodes**. A node is a markdown file, its
id is its filename with `.md` dropped (`principle.density.md` is
`principle.density`), its kind is the filename prefix before the first dot, and a
bare name (`voice.md`) is uncategorized. The glossary declares the category
vocabulary. There is no graph: no hierarchy, no inheritance, no edges. Nesting
into folders is a browsing convenience only.

| Part | Job |
| --- | --- |
| `manifest.yml` | Schema version and package id; the package's anchor. |
| `glossary.md` | The author's dictionary: every term with defined meaning in the corpus. Ghost ships no fixed vocabulary. |
| Prose nodes (`<kind>.<slug>.md`, `<slug>.md`) | Durable brand truths; each body answers why (the stance), with what (the materials), or how it is assembled (the patterns). Altitude lives in prose; narrower truths name their condition. |
| Node frontmatter | `description` (retrieval payload) and optional `materials` (repo-relative paths/globs or HTTPS URLs for concrete materials the prose governs). |
| `checks/` | Optional review assertions binding to nodes with `references`. Never a node source and never generation input. |

One resolution mechanism, read-only:

- **The menu.** `ghost gather` emits every node's id, kind, description, and
  material count. The agent reads the ask against descriptions and pulls the
  truths it judges relevant. Ghost does no NLP and no selection.

The entrypoint node is `index.md` (id `index`): the human-curated front door. It
is an ordinary node, listed in the menu like any other.

Checks are **not** nodes and are **never gathered**. They live in `checks/`,
bind to the prose they enforce via `references`, and are consumed only by
feedback projections such as `ghost review`.

Two rules keep the reservation honest:

- **The reserved list is closed.** `manifest.yml`, `glossary.md`, `checks/`.
  A new root entry ships only with an intentional schema change.
- **Materials are locators, not guidance.** Components, tokens, logos,
  illustrations, motion files, code patterns, and external asset libraries all
  use `materials`. The meaning of those materials lives in the node prose.

## The consumers

| Consumer | CLI surface | Projection it needs | Reads | Changes the model? |
| --- | --- | --- | --- | --- |
| **Authoring** | `ghost init`, `ghost validate`, `ghost checks init` | The raw nodes, checks, and glossary for a human or agent writing the fingerprint. | the package | **No**, this is the model. |
| **Generation** | `ghost gather [ask…]`, `ghost pull <ids>` | The flat menu, then selected node bodies and materials. | nodes only | **No** if selection stays with the agent and checks stay invisible. |
| **Local signal** | `ghost pulse` | The gitignored event tape (`.ghost/.events`) written by `gather` and `pull`, used to tune descriptions and menu ergonomics. | event ids and miss suggestions | **No**, observability must not become ranking, memory, or canonical state. |
| **Diff review** | `ghost review` | Touched files matched to node `materials`, relevant checks, referenced prose, gaps, and the diff. | nodes, checks, diff | **No** if checks bind by `references` and are not gathered. |
| **Fleet** | (future) | Many fingerprints at once: distances, cohorts, summaries. | many corpora, read-only | **No**, consumes exports read-only. |

## Known leaks

1. **Retrieval needs pushed into the shape.** When selection feels imprecise, the
   temptation is to encode routing in data: proliferating filename kinds until
   they become destinations, or turning the glossary into a dispatch table.
   *Fix: `description` is the retrieval payload; sharpen descriptions, show the
   menu, let the agent pick.*

2. **Filing by destination.** A truth authored as `for-emails.md` smuggles a
   routing model into the corpus. Conditions belong in prose as situations, not
   filename buckets.

3. **Guidance smuggled into `materials`.** A material locator list that starts
   carrying roles, rules, or semantic metadata becomes a second schema.
   *Fix: keep `materials` as strings only; write meaning in the node body.*

4. **Checks becoming generation input.** Checks are feedback assertions. If they
   appear in `gather`, the model starts writing to the test and the review
   signal collapses.
   *Fix: `checks/` is reserved and never loaded as nodes.*

5. **Checks routing by anything other than `references`.** Filtering checks by
   kind, folder, or implicit corpus convention leaks governance policy into the
   artifact.
   *Fix: a check says what prose it enforces via explicit node references.*

6. **A consumer demanding structure back.** Any consumer that wants edges,
   hierarchy, inheritance, or a precomputed slice is asking the corpus to do the
   projection's job.
   *Fix: the consumer builds its projection at read time; the corpus stays flat.*

## What we are NOT doing

- **Not** reintroducing a graph: no hierarchy, inheritance, or cross-node edges.
- **Not** adding a selection engine inside the artifact; the agent selects
  against descriptions.
- **Not** letting checks become generation input.
- **Not** letting `materials` become an asset metadata schema.
- **Not** giving any consumer write access to the shape of the corpus.

## One line

The flat corpus is how brand truths are **stored and owned**; the glossary plus
the `gather` menu is how context is **selected**; checks are how review is
**grounded**. One model, many projections, and the model never bends to serve a
projection.
