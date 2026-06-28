# Ghost

**Agents can assemble UI. They can't reliably preserve the _composition_ behind
it — the hierarchy, density, restraint, copy, trust, and flow that make a
surface feel intentional.**

Ghost is a checked-in product-surface fingerprint your agent reads before it
builds and checks after it changes. One package, `@anarchitecture/ghost`. One
CLI, `ghost`.

[Documentation](https://block.github.io/ghost/) · [npm](https://www.npmjs.com/package/@anarchitecture/ghost) · [Skill](#skill)

## The Shape

A fingerprint is a small folder of prose. The CLI computes; your agent reads,
writes, and decides.

```text
.ghost/
  manifest.yml      # schema + id
  surfaces.yml      # the spine: surfaces and their parent (core is implicit)
  nodes/*.md        # prose nodes — the design expression
  checks/*.md       # optional rules an agent evaluates
```

The fingerprint is a **graph of nodes**. A node is one markdown file:
frontmatter handles (`id`, `description`, `under`, `relates`, `incarnation`)
plus a prose body. You write that body through three lenses — they guide what to
capture, they are not fields:

- **intent** — the why and the stance.
- **inventory** — the materials, and pointers to the code an agent can inspect.
- **composition** — the patterns that make the surface feel like one product.

`under` cascades a node downward (`core` reaches every surface). `relates` links
nodes laterally. `description` is the retrieval payload — how an agent finds the
right node for a task. Checks validate output; they are never generation input.

## Install

```bash
npm install -D @anarchitecture/ghost
npx ghost --help
```

## Quick Start

```bash
ghost init          # scaffold .ghost/ — manifest, surfaces spine, one seed node
ghost validate      # links resolve, one root, acyclic
ghost gather        # list nodes; ghost gather <surface> composes a context slice
```

A node looks like this:

```markdown
---
id: checkout-trust
description: Trust at the payment moment.
under: checkout
relates:
  - to: core-trust
    as: reinforces
---

Near the moment of payment, reduce felt risk. Proximity of reassurance to the
action beats completeness. Never introduce a new visual system here.
```

## Skill

Ghost is **bring-your-own-agent**. Install the skill bundle so Claude Code,
Codex, Cursor, Goose, or another host agent knows how to author and use the
fingerprint:

```bash
npx ghost skill install
```

Then ask in plain English:

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
ghost checks --surface <ids>  # route the markdown checks the change touches
ghost review --surface <ids>  # after: an advisory packet grounded in the diff
```

The shift is timing: Ghost gives agents surface-composition context **before**
they build, not only after a review finds drift. Checked-in nodes are the source
of truth; ordinary Git review is the approval boundary for fingerprint edits.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` — manifest, surfaces spine, and a seed node. |
| `ghost scan` | Report node and surface contribution. |
| `ghost validate` | Validate the package: artifact shape and the node graph. |
| `ghost gather` | List nodes, or compose a surface's context slice. |
| `ghost checks` | Select and ground the checks a change touches, by surface. |
| `ghost review` | Emit an advisory review packet grounded in fingerprint + diff. |
| `ghost skill install` | Install the BYOA skill bundle. |
| `ghost signals` | Emit raw repo signals as authoring evidence _(advanced)_. |
| `ghost migrate` | Migrate a legacy `.ghost/` package onto the node model _(maintenance)_. |

Run `ghost --help` for the core workflow, `ghost --help --all` for everything,
and `ghost <command> --help` for flags.

## Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, node schema, on-disk
> `.ghost/` shape, and public exports may change in breaking ways before 1.0.
> Breaking changes may ship in minor versions while pre-1.0; patch versions are
> reserved for fixes that should not require migration. Pin the version you
> depend on and review release notes before upgrading.

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages are development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | Public package: the `ghost` CLI, folded core runtime, node authoring, checks, advisory review, and the skill bundle. | yes: `@anarchitecture/ghost` |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Private fleet view across many Ghost bundles. | no |
| [`packages/ghost-ui`](./packages/ghost-ui) | Reference design system: shadcn registry plus `ghost-mcp` server. | no |
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
