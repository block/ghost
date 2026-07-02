# Ghost

**You keep leaving the same review comment.** "Don't introduce a new button
style on checkout." "This empty state needs a way out." "That's not our voice."
The agent that built the thing never saw those decisions — so you flag them
again, and again.

Ghost lets you **write that decision down once, in your repo, so your agent
reads it before it builds** — not after you catch it. One package,
`@anarchitecture/ghost-fingerprint`. One CLI, `ghost`.

**New here?** The fastest path is [Five-Minute
Ghost](https://block.github.io/ghost/docs/quickstart) — one file, one win, no
vocabulary. The model underneath (the rest of this page) is optional until you
want it.

[Documentation](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@anarchitecture/ghost-fingerprint) · [Skill](#use-it)

## Install

```bash
npm install -D @anarchitecture/ghost-fingerprint
npx ghost skill install   # teach your agent to author and use the fingerprint
```

Every `ghost` command is also available as `ghost-fingerprint` — use it when
another tool on your machine owns the `ghost` bin.

## Use It

Ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
fingerprint, then ask in plain English:

```text
Set up the Ghost fingerprint for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the Ghost fingerprint.
```

The skill tells the agent what to read, what to write, and which CLI checks to
run. The CLI does the deterministic work; the agent does the interpretation.

## The Loop

```bash
ghost gather        # before building: list every truth — the agent picks what applies
ghost validate      # after edits: check the package shape and every node
```

The shift is timing: Ghost gives agents your brand decisions **before** they
build, not after a review finds the drift. Ghost grounds generation; it never
grades output. The checked-in files are the source of truth, and ordinary Git
review is how fingerprint edits get approved.

## Quick Start

```bash
ghost init          # scaffold .ghost/ with a manifest, a glossary, and a starter index.md
ghost validate      # package shape + node validity
ghost gather        # list the truths for the agent to pick from
```

**Your first node.** Don't try to fingerprint the whole product. Pick the one
decision you keep repeating in review — the trust rule you always re-state on
checkout, the pacing you always fix in settings — and write it down as one
file: `.ghost/principle.trust.md`. One good truth beats an empty catalog; you
grow the fingerprint one repeated decision at a time.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` with a manifest, a starter glossary, and a starter `index.md` node. |
| `ghost validate` | Validate the package: shape, node validity, and glossary kind prefixes. |
| `ghost gather` | Emit the fingerprint menu for the agent to select from. |
| `ghost skill install` | Install the skill bundle for your host agent. |
| `ghost manifest` | Emit a self-describing JSON manifest of commands and flags _(advanced)_. |

Reviewing changes and auditing code against the fingerprint live in Haunt
(`ghost-haunt review`, `ghost-haunt integrity`), the private adherence + drift
package (`packages/haunt`).

Run `ghost --help` for the core workflow, `ghost --help --all` for everything,
and `ghost <command> --help` for flags.

## How It Works (under the hood)

You don't need this section to use Ghost — your agent handles the format, and
[Five-Minute Ghost](https://block.github.io/ghost/docs/quickstart) gets you a
first win without any of it. Read on when you want to understand the model.

A fingerprint is a small folder of prose. The CLI computes; your agent reads,
writes, and decides.

```text
.ghost/
  manifest.yml          # schema + package id (the anchor)
  glossary.md           # your category vocabulary + what each category means
  index.md              # the curated front door: what this fingerprint is, what to read first
  principle.trust.md    # a brand truth of kind `principle`
  voice.md              # an uncategorized brand truth
  haunt/                # reserved: the adherence plugin's data (inventory + checks); never a node
```

The fingerprint is a **flat set of nodes** — no hierarchy, no inheritance, no
links between files. A node is one markdown file: a `description` in
frontmatter (the one-liner `gather` shows), a brand truth in the prose body.
Here is `principle.trust.md` (its id is its filename minus `.md`; its kind is
the prefix before the first dot, declared in the glossary):

```markdown
---
description: Trust at the payment moment.
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness. Never introduce a new visual system here.
```

That prose body is the whole point. You write it through three **authoring
lenses** — angles for thinking through what the body should say, not fields:

- **intent**: what the truth protects and for whom — "reduce felt risk near
  the payment moment."
- **inventory**: the materials, and pointers to code the agent can inspect.
- **composition**: the patterns that make the output feel intentional —
  "proximity of reassurance beats completeness."

**Where does specificity go, without a hierarchy?** Into the prose. A truth
that holds everywhere is stated plainly. A narrower truth names its
**condition** — the situation it applies in ("when a surface must show many
items at once…"), never a filing bucket. The agent reads the condition and
decides when it applies. Folders are allowed purely for human browsing; the
model reads a flat menu either way.

Reserved at the package root: `manifest.yml`, `glossary.md`, and the `haunt/`
subtree; every other `*.md` is a node. Renaming a node changes its id. Your
agent's own repo reconnaissance answers *what exists*; the fingerprint answers
*what you're trying to preserve*.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
> on-disk `.ghost/` package shape, and public JavaScript exports may
> change in breaking ways before a stable 1.0 release.
>
> Breaking changes may ship in minor versions while Ghost is pre-1.0. Patch
> versions are reserved for fixes that should not require migration. If you adopt
> Ghost today, expect some churn, pin the version you depend on, and review
> release notes before upgrading.

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages are development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | **Fingerprint** — the public `ghost` CLI, node authoring, corpus validation, the gather menu, and the skill bundle. The portable, medium-agnostic on-brand generation contract. | yes: `@anarchitecture/ghost-fingerprint` |
| [`packages/haunt`](./packages/haunt) | **Haunt** — the adherence + drift plugin. Lives in the fingerprint's reserved `.ghost/haunt/` subtree, bridges to code you already own, and emits advisory review and audit packets. | no |
| [`packages/vessel`](./packages/vessel) | **Vessel** — a standalone shadcn component registry plus `vessel-mcp` MCP server: the opinionated default reference / "batteries-included" body. Design-system-agnostic Ghost never requires it. | no |
| [`apps/docs`](./apps/docs) | Docs site. | no |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check
pnpm dump:cli-help
```

No API key is required to run Ghost.

## License

[Apache License 2.0](./LICENSE) · [Governance](./GOVERNANCE.md)
