# Ghost

**Agents can assemble UI. They can't reliably preserve the _composition_ behind
it: the hierarchy, density, restraint, copy, trust, and flow that make a
surface feel intentional.**

You keep leaving the same review comment — "don't introduce a new button style
on checkout," "this empty state needs a way out." Ghost lets you **write that
decision down once, in your repo, so your agent reads it before it builds** —
not after you flag it. One package, `@anarchitecture/ghost`. One CLI, `ghost`.

**New here?** The fastest path is [Five-Minute
Ghost](https://block.github.io/ghost/docs/quickstart) — one file, one win, no
vocabulary. The model underneath (the rest of this page) is optional until you
want it.

[Documentation](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@anarchitecture/ghost) · [Skill](#use-it)

## Install

```bash
npm install -D @anarchitecture/ghost
npx ghost skill install   # teach your agent to author and use the fingerprint
```

## Use It

Ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
fingerprint, then ask in plain English:

```text
Set up the Ghost fingerprint for this repo.
Brief this work from the Ghost fingerprint.
Review this change against the Ghost fingerprint.
```

The skill tells the agent what to read, what to write, and which CLI checks to
run. The CLI does the deterministic work; the agent does the interpretation.

## The Loop

```bash
ghost gather <surface>        # before: compose the context slice for the work
ghost checks --surface <ids>  # list the markdown checks and ground the named surfaces
ghost review --surface <ids>  # after: an advisory packet grounded in the diff
```

The shift is timing: Ghost gives agents surface-composition context **before**
they build, not only after a review finds drift. Checked-in nodes are the source
of truth; ordinary Git review is the approval boundary for fingerprint edits.

## Quick Start

```bash
ghost init          # scaffold .ghost/ with a manifest + a core index.md node
ghost validate      # links resolve, one root, acyclic
ghost gather        # list nodes; ghost gather <surface> composes a context slice
```

**Your first node.** Don't try to fingerprint the whole product. Pick the one
surface whose review feedback you keep repeating — the checkout you always flag
for trust, the settings form you always re-pace — and write that down. Add a
directory for it (`checkout/`), give it an `index.md`, and capture the decision
you keep making in prose. One good node beats an empty catalog; you grow the
fingerprint surface by surface as the next repeated decision shows up.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` with a manifest and a core `index.md` node. |
| `ghost scan` | Report node and surface contribution. |
| `ghost validate` | Validate the package: artifact shape and the node graph. |
| `ghost gather` | List nodes, or compose a surface's context slice. |
| `ghost checks` | List the markdown checks and ground the named surfaces. |
| `ghost review` | Emit an advisory review packet grounded in fingerprint + diff. |
| `ghost skill install` | Install the BYOA skill bundle. |
| `ghost signals` | Emit raw repo signals as authoring evidence _(advanced)_. |
| `ghost manifest` | Emit a self-describing JSON manifest of commands and flags _(advanced)_. |
| `ghost migrate` | Migrate a legacy `.ghost/` package onto the node model _(maintenance)_. |

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
  manifest.yml          # ghost.fingerprint-package/v1 anchor: schema + id
  index.md              # the core node, true everywhere (optional)
  <surface>/index.md    # a surface's own prose (the directory is the surface)
  <surface>/<node>.md   # a prose node placed in that surface
  checks/*.md           # optional ghost.check/v1 checks
```

The fingerprint is a graph of **nodes**, and the **directory tree is the graph**.
A node is a markdown file — frontmatter on top, a prose body below. Here is the
node at `checkout/trust.md` (its id is its path, `checkout/trust`, and its
parent is its directory, `checkout`):

```markdown
---
description: Trust at the payment moment.   # frontmatter: the descriptive fields
relates:
  - to: core/trust
    as: reinforces
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness. Never introduce a new visual system here.
```

That prose body is the whole point of the node. You write it through three
**authoring lenses** — they are angles for thinking through what the body should
say, the way the body above does:

- **intent**: what the surface is trying to do and for whom — "reduce felt risk
  near the payment moment."
- **inventory**: the materials, and pointers to code the agent can inspect.
- **composition**: the patterns that make the surface feel intentional —
  "proximity of reassurance beats completeness."

The lenses live in the prose; the frontmatter holds the fields. `description` is
the retrieval payload; `relates` links nodes laterally (the example reinforces
`core/trust`); `incarnation` would tag a node bound to one medium, like an
`email` or `voice` variant. This node has no `incarnation`, so it is
medium-agnostic — its **essence**.

A surface is just a directory, and a directory's own prose lives in its
`index.md`. The package-root `index.md` is the implicit `core` node, true
everywhere. Reserved at the package root: `manifest.yml` and the `checks/`
subtree; every other `*.md` is a node. `ghost signals` answers what exists; the
curated node graph answers what the surface is trying to preserve.

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
| [`packages/ghost`](./packages/ghost) | Public package: the `ghost` CLI, folded core runtime, node authoring, checks, advisory review, and the skill bundle. | yes: `@anarchitecture/ghost` |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Private fleet view across many Ghost bundles. | no |
| [`apps/docs`](./apps/docs) | Docs site. | no |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check
pnpm dump:cli-help
```

No API key is required to run Ghost. `OPENAI_API_KEY` / `VOYAGE_API_KEY` are
optional and only used by semantic embedding helpers when a host opts in.

## License

[Apache License 2.0](./LICENSE) · [Governance](./GOVERNANCE.md)
