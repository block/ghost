---
name: ghost
description: Author, validate, consume, and review against a repo-local Ghost fingerprint — the medium-agnostic articulation of a product's brand. Use when the user wants to set up a .ghost fingerprint, write or update brand-truth nodes, gather brand context before generation, or assemble a review packet from Ghost checks.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost — Brand Fingerprints

A Ghost fingerprint is the medium-agnostic articulation of a brand: its truths,
its stance, its conditions, and optional pointers to the concrete materials those
truths govern. One brand truth is stated once, at the altitude it is actually
true, and an agent reads the relevant truths before building.

```text
.ghost/
  manifest.yml        # schema + id (the package anchor)
  glossary.md         # the author's kind vocabulary
  materials/          # bundled materials; reserved, never nodes
  <kind>.<slug>.md    # a brand truth of a declared kind
  <slug>.md           # a brand truth without a kind
  haunts/             # optional attached capabilities (e.g. checks); never nodes
```

## The model in one breath

- A **node** is a markdown file: `description`, optional `materials`, and a prose
  brand truth.
- `materials` is one list of locators for the concrete stuff the truth is about:
  repo-relative paths/globs or absolute HTTPS URLs. `materials/` is reserved for
  bundled materials; reference living implementations where they already live.
  Guidance stays in prose.
- A node's **kind** comes from its filename prefix (`principle.density.md` →
  kind `principle`). A bare name (`voice.md`) has no kind.
- The **glossary** declares the kind vocabulary, what each kind means, and optional consumption posture: `steady` by default, or `posture: wild` for truths that push past the fingerprint and require explicit request.
- The starter `index.md` node (id `index`) is the human-curated front door:
  by convention it carries the non-negotiables and reading posture, and agents
  pull it first.
- There is **no hierarchy, no inheritance, no edges**. Directories are for browsing
  only; the model reads a flat menu.
- A **haunt** is an optional capability attached to the fingerprint, living
  under `.ghost/haunts/<id>/` with a thin `haunt.yml`. Haunts are feed-back;
  they never leak into generation context.
- **Checks** are the first haunt (`.ghost/haunts/checks/*.md`). Each check
  declares `references` to node ids and is used by `ghost review`. Checks are
  never emitted by `ghost gather` or `ghost pull`.

## The loop

```bash
ghost init          # scaffold .ghost/ with the steering starter
ghost haunt add checks  # opt in to review assertions
ghost validate      # artifact shape + node/material/haunt validation
ghost gather <ask>  # emit the fingerprint menu for this task
ghost pull <ids>    # read selected node bodies and materials
ghost review        # assemble diff + matched material-backed nodes + checks
ghost export        # package .ghost/ as a portable brand artifact
ghost pulse         # summarize local gather/pull events while tuning
```

`gather` does no selection. It emits the menu and you read the ask against it,
then pull the truths you judge relevant. Prefer `ghost pull` over reading files
directly: it emits the same prose, inlines small local materials by default, and
appends structured events to `.ghost/.events` for local tuning.

`review` does no grading. It assembles an advisory packet: touched files,
matched material-backed nodes, offered checks, coverage gaps, and the diff. The
host agent renders findings.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost init` | Scaffold `.ghost/` with the steering starter: manifest, glossary, `index.md`, and demo nodes for stance, composition, anti-goals, patterns, exemplars, materials, and decisions. `--template minimal` writes only the small manifest/glossary/index starter. `--with checks` also adds the checks haunt. |
| `ghost haunt add\|remove\|list` | Manage optional haunts (e.g. `ghost haunt add checks`). |
| `ghost validate [file-or-dir]` | Validate manifest, nodes, material locators, installed haunts, check references, and glossary kind prefixes. |
| `ghost gather [ask…] [--wild] [--format json]` | Emit the node menu for selection; log exposed ids. Default gather excludes wild kinds unless `--wild` is explicit. |
| `ghost pull <id> [<id>…]` | Emit selected nodes' full bodies and materials; log selected/missed ids. |
| `ghost review [--diff <path|->] [--base <ref>] [--format json]` | Emit an advisory review packet for a diff (requires the checks haunt). |
| `ghost export [--out <path>] [--no-haunts] [--strict] [--format json]` | Package `.ghost/` as a portable brand artifact and report which material locators will not travel. |
| `ghost pulse [--format json]` | Summarize local `.ghost/.events`. |
| `ghost skill install` | Install this skill bundle. |
| `ghost manifest [--format json]` | Emit a self-describing JSON manifest of every command and flag. |

## Receiving a fingerprint

Unpack the exported archive, run `ghost validate --package <dir>`, then run
`ghost skill install` in the receiving workspace. From there, gather and pull
against the unpacked package with `--package <dir>`.

## Workflows

- Author or update the fingerprint: follow [references/capture.md](references/capture.md).
- Write material-aware node bodies: follow [references/inventory.md](references/inventory.md).
- Choose the right human-agent authoring workflow: follow [references/authoring-scenarios.md](references/authoring-scenarios.md).
- Gather applicable truths for a task: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Explore deliberate provocations with wild nodes: follow [references/wild.md](references/wild.md).
- Probe readiness before generating: follow [references/self-check.md](references/self-check.md).
- Audit steering coverage: follow [references/steering-audit.md](references/steering-audit.md).
- Understand the package shape: see [references/schema.md](references/schema.md).

Fingerprint authoring is **elicitation, not scanning**. The raw material is what
the human brings and points at: words, images, links, exemplar products, brand
docs, copy they love or hate. Repo code can supply material locators and local
conventions, but durable brand truth should be curated by the human.

## When the fingerprint is silent

A silent fingerprint does not require stopping. Proceed from nearby product
surfaces, local conventions, and ordinary reasoning when safe, and label that
reasoning as provisional and non-Ghost-backed — unless the fingerprint itself
declares a stricter silence posture (check the `index` node), which overrides
this default. Ask a human before high-risk, irreversible, privacy, security,
legal, or brand-defining choices.

## Never

- Never invent hierarchy, inheritance, or cross-node edges.
- Never file a truth by destination (`for-emails.md`); state its condition in prose.
- Never put guidance in `materials`; it belongs in the node body.
- Never gather checks as generation context.
- Never claim provisional or local-convention reasoning as Ghost-backed.
