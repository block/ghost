---
name: ghost
description: Author, validate, and consume a repo-local Ghost fingerprint — the medium-agnostic articulation of a product's brand. Use when the user wants to set up a .ghost fingerprint, write or update brand-truth nodes, or gather the right brand context before generating UI, copy, email, or landing pages.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost — Brand Fingerprints

A Ghost fingerprint is the medium-agnostic articulation of a brand: its truths,
its stance, its conditions. One brand truth is stated once, at the altitude it is
actually true, and an agent reads the relevant truths and manifests them into
whatever it is building — product UI, marketing, email, a landing page. Ghost is
**feed-forward**: it grounds generation. It does not review or grade output.

```text
.ghost/
  manifest.yml        # schema + id (the package anchor)
  glossary.md         # the author's category vocabulary + what each category means
  <kind>.<slug>.md    # a brand truth of a declared kind (e.g. principle.density.md)
  <slug>.md           # an uncategorized brand truth (e.g. voice.md)
  haunt/              # reserved: the adherence plugin's subtree (inventory + checks); never a node
```

The checked-in `.ghost/` package is the source of truth. Ordinary Git workflow is
the staging and approval boundary: uncommitted changes are drafts, committed
changes are canonical. Ghost is not a lifecycle manager, a design-system
registry, or a review tool.

## The model in one breath

- A **node** is a markdown file: a `description` in frontmatter, a brand truth in
  the prose body.
- A node's **kind** comes from its filename prefix (`principle.density.md` → kind
  `principle`). A bare name (`voice.md`) is uncategorized — that is fine.
- The **glossary** declares the category vocabulary and what each category means
  (its normative weight). Kinds are the author's choice; Ghost ships no fixed
  vocabulary.
- There is **no hierarchy, no inheritance, no edges**. The package is a flat set
  of truths. Nesting into folders is a human-browsing convenience only; the model
  reads a flat menu.
- **Altitude lives in the prose.** A universal truth is stated plainly; a narrower
  truth names its **condition** — the *situation* it applies in ("when a surface
  must show many items at once…"), never a destination or filing bucket ("for
  emails:").

## The loop

The CLI does the deterministic work; you do the interpretation.

```bash
ghost init        # scaffold .ghost/ (manifest + glossary + a core node)
# ...author brand-truth nodes...
ghost validate    # artifact shape + node validity + kind-prefix check
ghost gather      # emit the fingerprint menu; you select the truths the task needs
```

`gather` does no selection. It emits the whole menu — every node's id, kind, and
description — and you read the ask against it and pull the truths you judge
relevant. That is "the right context at the right time": you select just-in-time
against the actual task, not against a precomputed slice.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost init` | Scaffold `.ghost/` with a manifest, a starter glossary, and a core `index.md` node. |
| `ghost validate [file-or-dir]` | Validate the package: artifact shape, per-node validity, and that each node's kind prefix is declared in the glossary. |
| `ghost gather [--format json]` | Emit the fingerprint menu (every node's id, kind, description) for the agent to select from. |
| `ghost skill install` | Install this skill bundle. |
| `ghost manifest [--format json]` | Emit a self-describing JSON manifest of every command and flag. |

Custom package dir: set `GHOST_PACKAGE_DIR=<relative-dir>` or pass `--package
<dir>` (e.g. one product in a monorepo).

## Workflows

- Author or update the fingerprint: follow [references/capture.md](references/capture.md).
- Write node bodies through the three lenses: follow [references/inventory.md](references/inventory.md).
- Choose the right human-agent authoring workflow: follow [references/authoring-scenarios.md](references/authoring-scenarios.md).
- Gather the applicable truths for a task: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief from the menu: follow [references/brief.md](references/brief.md).
- Probe your own readiness before generating: follow [references/self-check.md](references/self-check.md).
- Understand the package shape in full: see [references/schema.md](references/schema.md).

When the user asks to set up a fingerprint with `auto-draft`, treat that as an
agent authoring mode, not a CLI command: read the repo first, draft the smallest
evidence-backed nodes, then ask the human to curate them.

## How it works

The fingerprint is a **flat set of nodes**. A node is a markdown file — a
`description` in frontmatter, a brand truth in the prose body. The node at
`principle.trust.md` (id `principle.trust`, kind `principle`, slug `trust`):

```markdown
---
description: Trust at the payment moment.
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness. Never introduce a new visual system here.
```

- **Identity** is the filename minus `.md` (`marketing.email.md` → `marketing.email`).
- **Kind** is the first dotted segment of the filename, and must be a category the
  glossary declares. A bare name has no kind and is uncategorized.
- The **body** is written through three **authoring lenses** — angles for
  thinking, not fields:
  - intent: the why and the stance.
  - inventory: the materials and pointers to implementation the agent can inspect.
  - composition: the patterns that make it feel intentional.
- `description` is the retrieval payload: a one-line "what this is / when to
  gather it" (like a tool's name + description). It is what `gather` puts in the
  menu and what you select against.

The **glossary** (`glossary.md`) declares the categories and their meaning:

```markdown
---
categories:
  - name: principle
  - name: condition
  - name: exemplar
---

# principle
A durable stance: true across media unless a narrower condition explicitly limits it.

# condition
A situational truth: fires only when its stated situation holds.

# exemplar
An illustrative reference: useful evidence, not normative on its own.
```

`ghost validate` warns (does not fail) when a node's kind prefix is not a declared
category, suggesting the closest declared kind — so `guiding-principles.density.md`
is flagged with "did you mean `principle`?".

`manifest.yml` anchors the package with `schema: ghost.fingerprint-package/v1`.
Reserved at the package root: `manifest.yml`, `glossary.md`, and the `haunt/`
subtree (the adherence plugin's inventory + checks — never a node source);
every other `*.md` is a node. Moving or renaming a node changes its id.

## Always

- Treat checked-in fingerprint nodes as the source of truth.
- Author brand truths at the altitude they are actually true; state conditions as
  situations in the prose, never as filename destinations.
- Gather the menu and select the truths the task needs; read the descriptions and
  pull what applies.
- Manifest the truths into the medium you are building for — product, marketing,
  email, landing — the manifestation is yours to interpret.
- Validate with `ghost validate` before declaring fingerprint nodes useful.
- Treat fingerprint edits as ordinary Git-reviewed edits.
- Use local evidence as provisional, and label it as such, when the fingerprint is
  silent on a task.

## When the fingerprint is silent

A silent fingerprint does not require stopping. Proceed from nearby product
surfaces, local conventions, and ordinary reasoning when safe — and label that
reasoning as provisional and non-Ghost-backed. Ask a human before high-risk,
irreversible, or privacy/security/legal choices.

## Never

- Never invent a hierarchy, inheritance, or cross-node edges — the package is flat.
- Never file a truth by destination (`for-emails.md`); state its condition in prose.
- Never claim provisional or local-convention reasoning as Ghost-backed.
