# Ghost

Agents can assemble UI. What they cannot reliably preserve is the brand behind
that UI: the stance, the density, the restraint, the trust moves, and the
choices that make an output feel intentional.

Ghost keeps those brand truths in a repo-local `.ghost/` fingerprint package, a
flat corpus of prose nodes. The public npm shape is one package,
`@anarchitecture/ghost-fingerprint`, with one user-facing bin, `ghost`. The CLI validates
the corpus and emits the fingerprint menu; the host agent does all selection
and all interpretive BYOA work through the installed `ghost` skill.

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
and node validation, glossary kind-prefix checks, and a flat gather menu. An
**interpretive skill bundle** teaches the agent how to author and consume the
fingerprint. Ghost is **feed-forward**: it grounds generation and never grades
output. Review and audit live in Haunt, the private adherence layer.

The canonical root `.ghost/` package is a flat set of prose nodes:

```text
manifest.yml          # schema + id (the package anchor)
glossary.md           # the author's category vocabulary + what each kind means
<kind>.<slug>.md      # a brand truth of a declared kind (principle.density.md)
<slug>.md             # an uncategorized brand truth (voice.md)
```

The **corpus is flat**. A node is a markdown file: a `description` in
frontmatter (the retrieval payload), a brand truth in the prose body. A node's
identity is its filename minus `.md`; its kind is the filename prefix before
the first dot, declared in the glossary. There is no hierarchy, no
inheritance, no edges — nesting into folders is a browsing convenience only.
The body is written through three authoring lenses (they guide what to
capture, they are not fields):

- **intent**: the why and the stance.
- **inventory**: the materials, and pointers to code the agent can inspect.
- **composition**: the patterns that make the output feel intentional.

Altitude lives in the prose: a universal truth is stated plainly; a narrower
truth names its **condition** — the situation it applies in, never a filing
destination. `ghost gather` emits the whole menu (every node's id, kind, and
description); the agent selects just-in-time against the actual task. Reserved
at the package root: `manifest.yml` and `glossary.md`; every other `*.md` is a
node. Renaming a node changes its id. Checks do **not** live in `.ghost/`;
they live in Haunt's `.haunt/` package and bind to fingerprint prose via
`references`. Ordinary Git review is the approval boundary for fingerprint
edits.

## Packages

| Package | Published? | Description |
| --- | --- | --- |
| `packages/ghost` | yes: `@anarchitecture/ghost-fingerprint` | **Fingerprint** — unified public package. Ships the `ghost` CLI, node authoring, corpus validation, the flat gather menu, and the unified skill bundle. Shared runtime lives in `packages/ghost/src/ghost-core`. |
| `packages/vessel` | no | **Vessel** — a standalone shadcn component registry plus `vessel-mcp` MCP server: the opinionated default reference ("batteries-included" body a Haunt can inhabit). Design-system-agnostic; nothing in Ghost requires it. |
| `packages/haunt` | no | **Haunt** — the BYO-design-system adherence + drift layer. A `.haunt/` package bridges to code you already own (inventory with `paths` globs, checks with `references`); `haunt review` emits an advisory diff-review packet and `haunt integrity` emits a whole-inventory sprawl-audit packet. Requires a `.ghost/` fingerprint. |
| `apps/docs` | no | Docs site. |

## CLI Commands

Core workflow:

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` with a manifest, a starter glossary, and a core `index.md` node. |
| `ghost validate` | Validate the package: artifact shape, node validity, and glossary kind prefixes. |
| `ghost gather` | Emit the fingerprint menu for the agent to select from. |
| `ghost skill install` | Install the unified `ghost` skill bundle. |

Advanced/maintenance:

| Command | Description |
| --- | --- |
| `ghost manifest` | Emit a self-describing JSON manifest of every command and flag. |

Diff review and inventory audit live in Haunt (`haunt review`,
`haunt integrity`), the private adherence + drift package (`packages/haunt`).

## Public Exports

- `@anarchitecture/ghost-fingerprint` for the combined surface.
- `@anarchitecture/ghost-fingerprint/scan` for package-path resolution and legacy migration helpers.
- `@anarchitecture/ghost-fingerprint/fingerprint` for node package authoring, validation, parsing, and serialization.
- `@anarchitecture/ghost-fingerprint/core` for shared schemas, types, and loaders.
- `@anarchitecture/ghost-fingerprint/cli` for `buildCli()`.

## Environment Variables

No API key is required to run Ghost. Optional variables:

- `GHOST_PACKAGE_DIR` selects a custom package directory (or pass `--package`).

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
- The canonical on-disk form is a flat `.ghost/` package: `manifest.yml` plus
  `glossary.md` plus prose nodes (`<kind>.<slug>.md` or bare `<slug>.md`). The
  corpus is flat; kinds come from filename prefixes declared in the glossary,
  never from a separate declaration or a directory hierarchy.
- Skill recipes live in `packages/ghost/src/skill-bundle/references/`; install
  them with `ghost skill install`.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is generated
  by `pnpm dump:cli-help`. Re-run it after adding, removing, or renaming CLI
  commands or flags.
