# Ghost

**You keep leaving the same review comment.** "Don't introduce a new button
style on checkout." "This empty state needs a way out." "That's not our voice."
The agent that built the thing never saw those decisions, so you flag them
again, and again.

Ghost lets you **write that decision down once, in your repo, so your agent
reads it before it builds**. One package, `@anarchitecture/ghost-fingerprint`.
One CLI, `ghost`.

[Documentation](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@anarchitecture/ghost-fingerprint)

## Install

```bash
npm install -D @anarchitecture/ghost-fingerprint
npx ghost skill install
```

Every `ghost` command is also available as `ghost-fingerprint` when another tool
on your machine owns the `ghost` bin.

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

The CLI does deterministic work. The agent does interpretation.

## The Loop

```bash
ghost init          # scaffold .ghost/ with the steering starter (fingerprint only)
ghost haunt add checks  # opt in to review assertions
ghost validate      # check package shape, nodes, materials, and haunts
ghost gather <ask>  # before building: list every truth for this task
ghost pull <ids>    # read the picked truths' full bodies
ghost review        # during review: assemble a diff + matched nodes + checks packet
ghost pulse         # while tuning: summarize local gather/pull events
```

`gather` and `pull` append structured JSONL events to `.ghost/.events`, a local
gitignored tape. That's for tuning descriptions and seeing what agents reached
for. The tape is local scratch, not canonical fingerprint state.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` with the steering starter: manifest, glossary, `index.md`, and demo nodes for stance, composition, anti-goals, patterns, exemplars, materials, and decisions. `--template minimal` writes only the small manifest/glossary/index starter. `--with checks` also adds the checks haunt. |
| `ghost haunt add\|remove\|list` | Manage optional haunts — capabilities attached to the fingerprint (e.g. `checks`). |
| `ghost validate` | Validate the package: manifest, node validity, material locators, installed haunts, check references, and glossary kind prefixes. |
| `ghost gather [ask…]` | Emit the fingerprint menu for the agent to select from; log the exposed ids. |
| `ghost pull <id> [<id>…]` | Emit selected node bodies and material locators; log selected and missed ids. |
| `ghost review` | Emit an advisory review packet from a diff, matched material-backed nodes, and checks (requires the checks haunt). |
| `ghost pulse` | Summarize local gather/pull events: abandoned gathers, hit rates, cold nodes, and misses. |
| `ghost skill install` | Install the skill bundle for your host agent. |
| `ghost manifest` | Emit a self-describing JSON manifest of commands and flags _(advanced)_. |

Run `ghost --help` for the core workflow, `ghost --help --all` for everything,
and `ghost <command> --help` for flags.

## How It Works

A fingerprint is a small folder of prose. The CLI computes; your agent reads,
writes, and decides.

```text
.ghost/
  manifest.yml          # schema + package id (the anchor)
  glossary.md           # your category vocabulary + what each category means
  index.md              # the curated front door
  principle.trust.md    # a brand truth of kind `principle`
  asset.logo.md         # a truth that may point at concrete materials
  haunts/               # optional attached capabilities (e.g. checks); never nodes
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

`materials` is one list of locators for the concrete stuff the truth is about:
repo-relative paths/globs or absolute HTTPS URLs. Components, patterns, logos,
motion files, illustrations, and external asset libraries all use the same field.
Guidance stays in prose; `materials` only says where the material is.

The fingerprint is the ghost; **haunts** are what it does to the world. A haunt
is an optional capability attached under `.ghost/haunts/<id>/`, anchored by a
thin `haunt.yml`. Core `ghost init` ships no haunts; add them explicitly:

```bash
ghost haunt add checks
ghost haunt list        # Haunting this fingerprint: checks
```

Checks — the first haunt — live under `.ghost/haunts/checks/` and are not
nodes. They are review assertions used by `ghost review`:

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

`ghost gather` and `ghost pull` are feed-forward. `ghost review` is feed-back: it
reads a diff, matches touched files to node `materials`, offers relevant checks,
and emits an advisory packet for the host agent to judge.

Reserved at the package root: `manifest.yml`, `glossary.md`, and `haunts/`.
Every other `*.md` is a node. Renaming a node changes its id.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
> on-disk `.ghost/` package shape, and public JavaScript exports may change in
> breaking ways before a stable 1.0 release.

## Repo Layout

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | The public `ghost` CLI, node authoring, corpus validation, gather/pull, review packet assembly, and the skill bundle. | yes: `@anarchitecture/ghost-fingerprint` |
| [`packages/vessel`](./packages/vessel) | A standalone shadcn component registry plus `vessel-mcp` MCP server. | no |
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
