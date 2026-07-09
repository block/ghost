# Ghost

**Ghost is your brand, packed for agents.** A `.ghost/` folder of plain-prose
truths (your stance, your voice, your trust moves) checked into the repo and
read by any agent before it makes anything: a screen, an email, an empty
state, a sentence.

```text
.ghost/
  glossary.md           # your vocabulary
  principle.trust.md    # "near the moment of payment, reduce felt risk…"
  voice.md              # how the brand talks
  asset.logo.md         # points at the actual SVGs
```

Today those decisions live in reviewers' heads: "that's not our voice," again,
on every surface. The agent that built the thing never saw them. Ghost writes
them down once, where the agent looks first.

One portable packet; Claude Code, Codex, Cursor, and Goose all read the same
one. One package, `@design-intelligence/ghost`. One CLI, `ghost`.

[Documentation](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@design-intelligence/ghost)

## Install

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

## Use It

Ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
fingerprint, then ask in plain English:

```text
Set up the Ghost fingerprint for this repo.
Write down the decision I keep repeating about checkout.
Brief this work from the Ghost fingerprint.
Review this diff against the Ghost checks.
```

Ghost never calls an LLM itself; your agent does the thinking. No API key,
no lock-in.

## The Loop

```bash
ghost init          # scaffold .ghost/ with the skeleton starter
ghost checks init   # opt in to review assertions
ghost validate      # make sure the fingerprint is well-formed
ghost gather <ask>  # before building: list every truth relevant to this task
ghost pull <ids>    # read the picked truths' full bodies
ghost review        # during review: match a diff to truths and checks
ghost export        # package the fingerprint as a portable artifact
ghost pulse         # while tuning: see what agents reached for
```

Ghost keeps a private local log of what agents reached for; `ghost pulse`
reads it so you can tune descriptions. It stays on your machine and never
enters version control.

Run `ghost --help` for the core workflow and `ghost <command> --help` for
flags; the [CLI reference](https://block.github.io/ghost/docs/cli) covers
every command.

## Thesis

Agents changed the unit of design work. When they make the screens, the
emails, and the sentences, polishing any one of them moves nothing; the next
generation starts from the model's average again. The work that compounds is
architectural: decide where that average serves, decide where the brand must
win, and put those decisions where the agent reads before it makes.

Ghost is that artifact: a fingerprint checked into the repo, carrying the
truths, the materials they point at, and the conditions they hold under.
Buttons stay buttons. The moments that carry your brand get your stance
instead of the default. The few author it once. Every agent it travels to
builds from it.

## How It Works

A fingerprint is a small folder of prose. The CLI computes; your agent reads,
writes, and decides.

```text
.ghost/
  manifest.yml          # schema + package id (the anchor)
  glossary.md           # your kind vocabulary + what each kind means
  index.md              # the curated front door
  principle.trust.md    # a brand truth of kind `principle`
  asset.logo.md         # a truth that may point at concrete materials
  checks/               # optional review assertions; never nodes
```

The fingerprint is a **flat set of nodes**. A node is one markdown file: a
`description` in frontmatter, optional `materials`, and a brand truth in the
prose body.

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
truth is about: repo-relative paths/globs or absolute HTTPS URLs. Components,
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

`gather` and `pull` run before your agent builds. `review` runs after: it
reads a diff, matches touched files to node `materials`, offers relevant
checks, and emits an advisory packet for the host agent to weigh. Review
output never enters generation context.

The packet is the product; the CLI is the courier. Everything above
(gather, pull, review, checks, the local log) is machinery around the
fingerprint, and the fingerprint outlives all of it.

## Portable by Design

The fingerprint travels. It is agent-agnostic (every host agent reads the same
packet), medium-agnostic (the same truths steer a screen, a page, an email, a
sentence), and repo-native (it moves with a clone, a fork, a new hire's first
checkout). When you need it as a standalone artifact:

```bash
ghost export
```

The export audits every `materials` entry so the packet doesn't silently
point at things that moved.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
> on-disk `.ghost/` package shape, and public JavaScript exports may change in
> breaking ways before a stable 1.0 release.

## Repo Layout

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | The public `ghost` CLI, node authoring, fingerprint validation, gather/pull, review packet assembly, and the skill bundle. | yes: `@design-intelligence/ghost` |
| [`packages/vessel-react`](./packages/vessel-react) | A standalone shadcn component registry plus `vessel-mcp` MCP server. | no |
| [`packages/vessel-light`](./packages/vessel-light) | Vessel's design language as a portable `.ghost/` fingerprint for agents writing raw HTML/CSS. | no |
| [`packages/steering-eval`](./packages/steering-eval) | Before/after evaluation harness: measures what a `.ghost` fingerprint buys as a self-contained `report.html`. | no |
| [`apps/docs`](./apps/docs) | Docs site. | no |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check
pnpm dump:cli-help
```

Every `ghost` command is also available as `ghost-fingerprint` when another
tool on your machine owns the `ghost` bin.

## License

[Apache License 2.0](./LICENSE) · [Governance](./GOVERNANCE.md)
