# Ghost

Agents can assemble UI. What they cannot reliably preserve is the product
surface composition behind that UI: hierarchy, density, restraint, repetition,
trust, flow, and the choices that make a surface feel intentional.

Ghost keeps that surface composition in a repo-local `.ghost/` fingerprint
package, a graph of prose nodes. The public npm shape is one package,
`@anarchitecture/ghost-fingerprint`, with one user-facing bin, `ghost`. The CLI validates
the node graph, composes context, selects and grounds checks, and emits
deterministic packets. The host agent does the interpretive BYOA work through the installed
`ghost` skill.

## Build & Run

```bash
pnpm install          # install dependencies (pnpm 10+, Node 20.19+ or 22.12+)
pnpm build            # build all packages
pnpm test             # vitest across packages
pnpm check            # biome, typecheck, file-size, CLI manifest drift
pnpm dump:cli-help    # regenerate apps/docs/src/generated/cli-manifest.json
```

Run the public CLI after building:

```bash
node packages/ghost/dist/bin.js <command>
pnpm --filter @anarchitecture/ghost-fingerprint exec ghost <command>
```

## Architecture

Ghost is **BYOA (bring your own agent)**. Claude Code, Codex, Cursor, Goose, or
another host agent reads, decides, and writes. Ghost grounds that work with two
things. A **deterministic CLI** does the repeatable parts with no LLM: schema
and graph validation, repo-signal helpers, context composition, check selection
and grounding, and advisory review packets. An **interpretive skill bundle** teaches the agent
how to author and use the fingerprint.

The canonical root `.ghost/` package is a directory tree of prose nodes:

```text
manifest.yml          # schema + id
index.md              # the core node, true everywhere (optional)
<surface>/index.md    # a surface's own prose (the directory is the surface)
<surface>/<node>.md   # a prose node placed in that surface
checks/*.md           # optional ghost.check/v1 checks
```

The **directory tree is the graph**. A node is a markdown file: descriptive
frontmatter (`description`, `relates`) plus a prose body. A
node's identity is its path (`marketing/email.md` → `marketing/email`) and its
parent is its containing directory. A surface is just a directory, and a
directory's own prose lives in its `index.md`. The package-root `index.md` is
the implicit `core` node. The body is written through three authoring lenses
(they guide what to capture, they are not fields):

- **intent**: the why and the stance.
- **inventory**: the materials, and pointers to code the agent can inspect.
- **composition**: the patterns that make the surface feel intentional.

`description` is the retrieval payload; `relates` links nodes laterally.
Reserved at the package root:
`manifest.yml` and the `checks/` subtree; every other `*.md` is a node. Moving a
node is a rename. `checks/*.md` validate output and bind to the prose they enforce
via an optional `source:` pointer; every check is offered and the agent judges
which apply. They are not generation input. Ordinary Git review is the approval boundary for fingerprint
edits.

## Packages

| Package | Published? | Description |
| --- | --- | --- |
| `packages/ghost` | yes: `@anarchitecture/ghost-fingerprint` | **Fingerprint** — unified public package. Ships the `ghost` CLI, node authoring, graph validation, check selection and grounding, advisory review packets, and the unified skill bundle. Shared runtime lives in `packages/ghost/src/ghost-core`. |
| `packages/vessel` | no | **Vessel** — a standalone shadcn component registry plus `vessel-mcp` MCP server: the opinionated default reference ("batteries-included" body a Haunt can inhabit). Design-system-agnostic; nothing in Ghost requires it. |
| `packages/haunt` | no | **Haunt** — the BYO-design-system adherence + drift layer (Problem A). Bridges to code you already own and grades high-altitude compositional drift. Scaffolded; see `notes/naming-and-structure.md`. |
| `apps/docs` | no | Docs site. |

## CLI Commands

Core workflow:

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` with a manifest and a core `index.md` node. |
| `ghost validate` | Validate the package: artifact shape and node validity. |
| `ghost gather` | Emit the fingerprint menu for the agent to select from. |
| `ghost skill install` | Install the unified `ghost` skill bundle. |

Advanced/maintenance:

| Command | Description |
| --- | --- |
| `ghost manifest` | Emit a self-describing JSON manifest of every command and flag. |

Diff review lives in Haunt (`haunt review`), the private adherence + drift
package (`packages/haunt`).

## Public Exports

- `@anarchitecture/ghost-fingerprint` for the combined surface.
- `@anarchitecture/ghost-fingerprint/scan` for package-path resolution, checks-dir loading, and legacy migration helpers.
- `@anarchitecture/ghost-fingerprint/fingerprint` for node package authoring, validation, parsing, and serialization.
- `@anarchitecture/ghost-fingerprint/core` for shared schemas, types, and loaders.
- `@anarchitecture/ghost-fingerprint/cli` for `buildCli()`.

## Environment Variables

No API key is required to run Ghost. Optional variables:

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` are consumed only by semantic embedding
  helpers when a host opts into enriched comparison.

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## Releasing & Changesets

`@anarchitecture/ghost-fingerprint` is the only public package. Private packages are
ignored by Changesets.

When an agent completes a user-visible change to the public package, write a
changeset file instead of asking the user to run `pnpm changeset`:

```markdown
---
"@anarchitecture/ghost-fingerprint": patch
---

One sentence, user-facing, present tense.
```

Use `patch` for fixes and docs, `minor` for new commands/flags/exports, and
`major` for removed or renamed public behavior.

## Conventions

- Keep publishable runtime code self-contained in `packages/ghost`; no
  `workspace:*` runtime dependencies in the packed public artifact.
- The canonical on-disk form is a `.ghost/` directory tree: `manifest.yml` plus
  prose nodes (`index.md` and `<surface>/<node>.md`) and optional `checks/*.md`.
  The directory layout is the graph; ids and parents come from paths, never a
  separate declaration.
- Skill recipes live in `packages/ghost/src/skill-bundle/references/`; install
  them with `ghost skill install`.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is generated
  by `pnpm dump:cli-help`. Re-run it after adding, removing, or renaming CLI
  commands or flags.
