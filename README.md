# ghost

Use ghost to give agents applicable brand guidance before they start work. A
`.ghost/` package stores your stance, voice, trust moves, and concrete materials
in the repo. Agents select and read that guidance while working on a screen,
email, empty state, or sentence.

```text
.ghost/
  glossary.md           # your vocabulary
  principle.trust.md    # "near the moment of payment, reduce felt risk…"
  voice.md              # how the brand talks
  asset.logo.md         # points at the actual SVGs
```

Reviewers repeat the same feedback on every surface: "that's not our voice."
Write the decision in `.ghost/` so the next agent has it before starting work.

Claude Code, Codex, Cursor, and Goose can all use the same guidance.

[Project site](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@design-intelligence/ghost)

> [!WARNING]
> ghost is a public development preview. It is not ready for adoption, and we
> are not seeking external testers yet. The CLI, package format, and APIs may
> change without migration support.

## Install

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

## Use It

ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
ghost package, then ask in plain English:

```text
Set up the ghost package for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the ghost package.
Review this diff against the ghost checks.
```

Your agent selects, interprets, and applies the guidance. The CLI handles the
repeatable work without calling an LLM, so ghost needs no API key and does not
lock you into one agent.

## Use Guidance While Making

Your agent works with the package through a small set of commands:

```bash
ghost init          # scaffold .ghost/ with the skeleton starter
ghost checks init   # opt in to review assertions
ghost validate      # make sure the package is well-formed
ghost gather [ask]  # before building: show the complete guidance menu
ghost pull <ids>    # read the picked nodes' full bodies
ghost review        # during review: match a diff to guidance and checks
ghost export        # bundle the guidance as a portable artifact
ghost pulse         # while tuning: see what agents reached for
```

For a task-specific gather, your agent reads the complete, unfiltered menu and
pulls every node whose stated situation applies. Bare `ghost gather` inspects
the catalog without grounding a task. Because only selected nodes enter the
working context, the agent can see the shape of the brand without loading the
whole package.

`gather` and `pull` write a Git-ignored local log. Use `ghost pulse` to inspect
it and tune node descriptions.

Run `ghost --help` for the core workflow and `ghost <command> --help` for
current flags and command behavior.

## Thesis

Agents now make screens, emails, and sentences. Polishing one output does not
help the next generation. Record where the model's default is good enough and
where the brand must differ, then give those decisions to the agent before it
starts.

A `.ghost/` package keeps that guidance in the repo with the materials it
points at and the conditions where it applies. Buttons stay buttons. The
moments that carry your brand get your stance instead of the default. Write the
decision once, and each agent can use it when the same situation returns.

## How It Works

A ghost package is a small folder of prose. Your agent finds the guidance that
applies, reads it, and uses it while making. The CLI supports that work with
repeatable commands for scaffolding, validation, retrieval, and review.

```text
.ghost/
  manifest.yml          # schema + package id + optional cover id
  glossary.md           # your kind vocabulary + what each kind means
  brand.md              # example cover inlined by gather
  principle.trust.md    # guidance of kind `principle`
  asset.logo.md         # guidance that points at concrete materials
  checks/               # optional review assertions; never nodes
```

The package is a **flat set of nodes**. The optional `cover:` in
`manifest.yml` may name any node; `ghost gather` inlines it before the menu.
The default skeleton calls that node `brand`, but the filename is not reserved.
A node is one markdown file: a `description` in frontmatter, optional
`materials`, and brand guidance in the prose body.

```markdown
---
description: Logo lockups, clearspace, and when the glyph can stand alone.
materials:
  - brand/logo*.svg
  - https://figma.com/file/example?node-id=logo-lockups
---

Use the full lockup when recognition matters. Use the glyph only when space is
constrained or when brand presence should recede.
```

`materials` is a list of paths or URLs pointing at the concrete stuff the
guidance is about: repo-relative paths/globs or absolute HTTPS URLs. Components,
patterns, logos, motion files, illustrations, and external asset libraries all
use the same field. Guidance stays in prose; `materials` only says where the
material is.

**Checks** are optional review assertions in a flat `.ghost/checks/` directory.
Core `ghost init` ships no checks; add them explicitly:

```bash
ghost checks init
```

Checks are not nodes. They are review assertions used by `ghost review`:

```markdown
---
name: logo-clearspace-holds
description: Logo usage preserves clearspace, lockup integrity, and glyph rules.
severity: medium
references:
  - asset.logo
---

Grade whether the change preserves the logo guidance in `asset.logo`.
```

`gather` and `pull` give your agent applicable guidance before it builds.
`review` supports the same agent after a change exists: the CLI reads a diff,
matches touched files to node `materials`, and offers relevant checks for the
agent to weigh. Review output never enters generation context.

## The Package Travels

Different agents can read the same guidance and apply it to a screen, page,
email, or sentence. The package moves with the repo when someone clones or
forks it. To move the package on its own:

```bash
ghost export
```

The export audits `materials` entries and reports paths that moved.

## Repo Layout

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | The public `ghost` CLI, node authoring, package validation, gather/pull, review packet assembly, and the skill bundle. | yes: `@design-intelligence/ghost` |
| [`packages/vessel-react`](./packages/vessel-react) | A standalone shadcn component registry plus `vessel-mcp` MCP server. | no |
| [`packages/vessel-light`](./packages/vessel-light) | Vessel's design language as a portable `.ghost/` package for agents writing raw HTML/CSS. | no |
| [`packages/steering-control`](./packages/steering-control) | Before/after evaluation harness: measures what a `.ghost` package buys as a self-contained `report.html`. | no |
| [`apps/docs`](./apps/docs) | Public thesis site. | no |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check
```

Every `ghost` command is also available as `ghost-fingerprint` when another
tool on your machine owns the `ghost` bin.

## License

[Apache License 2.0](./LICENSE) · [Governance](./GOVERNANCE.md)
