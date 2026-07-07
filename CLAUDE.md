# Ghost

Agents now do the making — screens, emails, empty states, sentences. What they
cannot reliably preserve is the brand behind that work: the stance, the
density, the restraint, the trust moves, and the choices that make an output
feel intentional. An agent holds nothing it isn't handed.

Ghost hands it the brand as a portable steering packet: a repo-local `.ghost/`
fingerprint package, a flat corpus of prose nodes read before anything is made. The public npm shape is one package,
`@design-intelligence/ghost`, with one user-facing bin, `ghost`. The CLI
validates the corpus, emits the fingerprint menu, pulls selected nodes, records
local selection events, and assembles advisory review packets from checks. Optional
review checks attach under `.ghost/checks/`. The host agent does all
selection and interpretive BYOA work through the installed `ghost` skill.

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
pnpm --filter @design-intelligence/ghost exec ghost <command>
```

## Architecture

Ghost is **BYOA (bring your own agent)**. Claude Code, Codex, Cursor, Goose, or
another host agent reads, decides, and writes. Ghost grounds that work with a
deterministic CLI and an interpretive skill bundle. The CLI does repeatable work
with no LLM: schema and node validation, glossary kind-prefix checks, check
validation, a flat gather menu, selected-node pulls, local pulse summaries, and
review packet assembly. The skill teaches the agent how to author and consume
the fingerprint.

The canonical root `.ghost/` package is a flat set of prose nodes plus optional
checks:

```text
manifest.yml          # schema + id (the package anchor)
glossary.md           # the author's category vocabulary + what each kind means
<kind>.<slug>.md      # a brand truth of a declared kind (principle.density.md)
<slug>.md             # an uncategorized brand truth (voice.md)
checks/               # optional review assertions; never a node source
```

The **corpus is flat**. A node is a markdown file: a `description` in
frontmatter (the retrieval payload), optional `materials`, and a brand truth in
the prose body. A node's identity is its filename minus `.md`; its kind is the
filename prefix before the first dot, declared in the glossary. There is no
hierarchy, no inheritance, no edges; nesting into folders is a browsing
convenience only.

`materials` is the single locator field for concrete materials the truth is
about. It accepts repo-relative paths/globs and absolute HTTPS URLs. Components,
patterns, logos, motion files, illustrations, and external asset libraries all
use the same field. Guidance stays in prose; `materials` only says where the
material is.

While drafting a body, ask three questions of every truth (drafting prompts,
never fields): **why** (the stance), **with what** (the materials, and pointers
to implementation or assets the agent can inspect), and **how it is assembled**
(the patterns that make the output feel intentional).

Altitude lives in the prose: a universal truth is stated plainly; a narrower
truth names its **condition**, the situation it applies in, never a filing
destination. `ghost gather` emits the whole menu (every node's id, kind,
description, and material count); the agent selects just-in-time against the
actual task. `ghost pull` emits selected node bodies and materials. `ghost
review` reads a diff, matches touched files to node materials, offers relevant
checks, and emits an advisory packet for the host agent to judge.

**Checks** (`.ghost/checks/*.md`) are optional review assertions that declare
`references` to fingerprint node ids (with optional heading anchors) and prose
instructions for the reviewing agent. Checks are feed-back only and never leak
into generation context. Scaffold them with `ghost checks init` or `ghost init
--with checks`. Ordinary Git review is the approval boundary for fingerprint
edits and checks.

## Packages

| Package | Published? | Description |
| --- | --- | --- |
| `packages/ghost` | yes: `@design-intelligence/ghost` | The public package. Ships the `ghost` CLI, node authoring, corpus validation, gather/pull/pulse, review packet assembly, and the unified skill bundle. Shared runtime lives in `packages/ghost/src/ghost-core`. |
| `packages/vessel` | no | A standalone shadcn component registry plus `vessel-mcp` MCP server: the opinionated default reference body. Design-system-agnostic; nothing in Ghost requires it. |
| `apps/docs` | no | Docs site. |

## CLI Commands

Core workflow:

| Command | Description |
| --- | --- |
| `ghost init` | Scaffold `.ghost/` with a manifest, starter glossary, and a starter `index.md`. `--with checks` also adds the checks directory. |
| `ghost checks init` | Scaffold `.ghost/checks/` with an example review assertion. |
| `ghost validate` | Validate the package: manifest shape, node validity, material locators, check references, and glossary kind prefixes. |
| `ghost gather [ask…]` | Emit the fingerprint menu for the agent to select from. |
| `ghost pull <id> [<id>…]` | Emit selected nodes' bodies and materials; append the selection to the local `.ghost/.events` tape. |
| `ghost review` | Emit an advisory review packet for a diff using material-backed nodes and checks (requires `.ghost/checks/`). |
| `ghost pulse` | Summarize local gather/pull events from `.ghost/.events`. |
| `ghost skill install` | Install the unified `ghost` skill bundle. |

Advanced/maintenance:

| Command | Description |
| --- | --- |
| `ghost manifest` | Emit a self-describing JSON manifest of every command and flag. |

## Public Exports

- `@design-intelligence/ghost` for the combined surface.
- `@design-intelligence/ghost/scan` for package-path resolution helpers.
- `@design-intelligence/ghost/fingerprint` for node package authoring, validation, parsing, and serialization.
- `@design-intelligence/ghost/core` for shared schemas, types, and loaders.
- `@design-intelligence/ghost/cli` for `buildCli()`.

## Environment Variables

No API key is required to run Ghost. Optional variables:

- `GHOST_PACKAGE_DIR` selects a custom package directory (or pass `--package`).

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## Releasing & Changesets

`@design-intelligence/ghost` is the only public package. Private packages
are ignored by Changesets.

When an agent completes a user-visible change to the public package, write a
changeset file instead of asking the user to run `pnpm changeset`:

```markdown
---
"@design-intelligence/ghost": patch
---

One sentence, user-facing, present tense.
```

Use `patch` for fixes and docs, `minor` for new commands/flags/exports, and
`major` for removed or renamed public behavior.

## Conventions

- Keep publishable runtime code self-contained in `packages/ghost`; no
  `workspace:*` runtime dependencies in the packed public artifact.
- The canonical on-disk form is a flat `.ghost/` package: `manifest.yml` plus
  `glossary.md` plus prose nodes (`<kind>.<slug>.md` or bare `<slug>.md`) plus
  an optional `.ghost/checks/` directory. The corpus is flat; kinds come
  from filename prefixes declared in the glossary, never from a separate
  declaration or a directory hierarchy.
- Skill recipes live in `packages/ghost/src/skill-bundle/references/`; install
  them with `ghost skill install`.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is generated
  by `pnpm dump:cli-help`. Re-run it after adding, removing, or renaming CLI
  commands or flags.
