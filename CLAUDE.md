# Ghost

Agents can assemble UI. What they cannot reliably preserve is the product
surface composition behind that UI: hierarchy, density, restraint, repetition,
trust, flow, and the choices that make a surface feel intentional.

Ghost keeps that surface composition in a repo-local `.ghost/` fingerprint
package — a graph of prose nodes. The public npm shape is one package,
`@anarchitecture/ghost`, with one user-facing bin, `ghost`. The CLI validates
the node graph, composes context, routes checks, and emits deterministic
packets. The host agent does the interpretive BYOA work through the installed
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
pnpm --filter @anarchitecture/ghost exec ghost <command>
```

## Architecture

Ghost is **BYOA (bring your own agent)**. Claude Code, Codex, Cursor, Goose, or
another host agent reads, decides, and writes. Ghost is the deterministic
calculator the agent reaches for: schema and graph validation, repo-signal
helpers, context composition, check routing, and advisory review packets.

The canonical root `.ghost/` package is a flat folder:

```text
manifest.yml      # schema + id
surfaces.yml      # the spine: surfaces and their parent (core is implicit)
nodes/*.md        # prose nodes — the design expression
checks/*.md       # optional ghost.check/v1 checks
```

The fingerprint is a **graph of nodes**. A node is one markdown file:
frontmatter handles (`id`, `description`, `under`, `relates`, `incarnation`)
plus a prose body. The body is written through three authoring lenses — they
guide what to capture, they are not fields or node types:

- **intent** — the why and the stance.
- **inventory** — the materials, and pointers to code the agent can inspect.
- **composition** — the patterns that make the surface feel intentional.

`under` cascades a node downward (`core` is the implicit root and reaches every
surface). `relates` links nodes laterally. `description` is the retrieval
payload. `checks/*.md` validate output, routed by surface; they are not
generation input. Surfaces are declared in `surfaces.yml`, never inferred from
filenames. Ordinary Git review is the approval boundary for fingerprint edits.

A package may `extend` another by identity (the shared-brand pattern): the
manifest's `extends` maps a package id to where it lives, and nodes reference
inherited context by identity (`under: brand:core`), never by path.

## Packages

| Package | Published? | Description |
| --- | --- | --- |
| `packages/ghost` | yes: `@anarchitecture/ghost` | Unified public package. Ships the `ghost` CLI, node authoring, graph validation, check routing, advisory review packets, and the unified skill bundle. |
| `packages/ghost-core` | no | Private historical shared package. Runtime code needed by npm is folded into `packages/ghost/src/ghost-core`. |
| `packages/ghost-fleet` | no | Private fleet view across many Ghost bundles. Consumes workspace exports from `@anarchitecture/ghost`. |
| `packages/ghost-ui` | no | Reference design system: shadcn registry plus `ghost-mcp` MCP server. |
| `apps/docs` | no | Docs site. |

## CLI Commands

Core workflow:

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` — manifest, surfaces spine, and a seed node. |
| `ghost scan` | Report node and surface contribution. |
| `ghost validate` | Validate the package: artifact shape and the node graph (links resolve, one root, acyclic). |
| `ghost gather` | List nodes by id + description, or compose a surface's context slice (own + inherited + edges). |
| `ghost checks` | Select and ground the markdown checks governing the named surfaces. |
| `ghost review` | Emit an advisory review packet: touched surfaces, routed checks, fingerprint grounding, and the diff. |
| `ghost skill install` | Install the unified `ghost` skill bundle. |

Advanced/maintenance:

| Command | Description |
| --- | --- |
| `ghost signals` | Emit raw repo signals as JSON for fingerprint authoring. |
| `ghost migrate` | Migrate a legacy `.ghost/` package onto the node-graph surface model. |

`ghost scan --format json` is deterministic contribution state. It does not run
an LLM.

## Public Exports

- `@anarchitecture/ghost` for the combined surface.
- `@anarchitecture/ghost/scan` for scan contribution and source signals.
- `@anarchitecture/ghost/fingerprint` for node package authoring, validation, parsing, and serialization.
- `@anarchitecture/ghost/core` for shared schemas, types, and loaders.
- `@anarchitecture/ghost/cli` for `buildCli()`.

## Environment Variables

No API key is required to run Ghost. Optional variables:

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` are consumed only by semantic embedding
  helpers when a host opts into enriched comparison.

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## Releasing & Changesets

`@anarchitecture/ghost` is the only public package. Private packages are
ignored by Changesets.

When an agent completes a user-visible change to the public package, write a
changeset file instead of asking the user to run `pnpm changeset`:

```markdown
---
"@anarchitecture/ghost": patch
---

One sentence, user-facing, present tense.
```

Use `patch` for fixes and docs, `minor` for new commands/flags/exports, and
`major` for removed or renamed public behavior.

## Conventions

- Keep publishable runtime code self-contained in `packages/ghost`; no
  `workspace:*` runtime dependencies in the packed public artifact.
- The canonical on-disk form is a flat `.ghost/` package: `manifest.yml`,
  `surfaces.yml`, `nodes/*.md`, and optional `checks/*.md`.
- The graph is the only model. Surfaces are the only locality; they are
  declared in `surfaces.yml`, never inferred from paths or filenames.
- Skill recipes live in `packages/ghost/src/skill-bundle/references/`; install
  them with `ghost skill install`.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is generated
  by `pnpm dump:cli-help`. Re-run it after adding, removing, or renaming CLI
  commands or flags.
