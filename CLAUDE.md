# Ghost

Agents can write UI. What they cannot reliably preserve is the product
experience identity behind that UI: hierarchy, density, restraint, repetition,
trust, flow, and the decisions that make a surface feel intentional.

Ghost keeps that memory in a repo-local `.ghost/` bundle. The public npm shape
is one package, `@anarchitecture/ghost`, with one user-facing bin, `ghost`.
The CLI validates, computes, compares, and emits deterministic packets. The
host agent does the interpretive BYOA work through the installed `ghost` skill.

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
calculator the agent reaches for: schema validation, inventory/cache helpers,
structural diffs, drift checks, comparison math, and handoff packets.

The canonical root `.ghost/` bundle follows:

```text
fingerprint.yml -> checks.yml
memory and why     deterministic gates
```

Optional memory lives beside it:

- `intent.md` for human-authored or human-approved product intent.
- `decisions/*.yml` for accepted/rejected product-experience rationale.
- `proposals/*.yml` for staged memory changes before promotion.
- `cache/` for generated inventory. Cache answers what exists; fingerprint
  memory answers what matters and why.

Legacy `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` may still
appear in older repos or as migration source material. They are not canonical
memory for new Ghost work.

## Packages

| Package | Published? | Description |
| --- | --- | --- |
| `packages/ghost` | yes: `@anarchitecture/ghost` | Unified public package. Ships the `ghost` CLI, scan/memory authoring, checks, advisory review packets, comparison, drift stance verbs, and the unified skill bundle. |
| `packages/ghost-core` | no | Private historical shared package. Runtime code needed by npm is folded into `packages/ghost/src/ghost-core`. |
| `packages/ghost-scan` | no | Private historical scan package. Runtime code needed by npm is folded into `packages/ghost/src/scan`. |
| `packages/ghost-fleet` | no | Private fleet view across many Ghost bundles. Consumes workspace exports from `@anarchitecture/ghost`. |
| `packages/ghost-ui` | no | Reference design system: shadcn registry plus `ghost-mcp` MCP server. |
| `apps/docs` | no | Docs site. |

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/{fingerprint.yml,checks.yml,proposals/,cache/}`. |
| `ghost scan` | Report scan state and BYOA next-step guidance. |
| `ghost inventory` | Emit raw repo signals as JSON for optional cache/source material. |
| `ghost lint` | Validate a bundle or single artifact. |
| `ghost verify` | Validate fingerprint evidence paths, typed check refs, and optional memory. |
| `ghost describe` | Print optional `intent.md` or direct markdown section ranges. |
| `ghost diff` | Structural prose-level diff between direct fingerprints. |
| `ghost survey <op>` | Legacy/cache helpers for optional `ghost.survey/v2` workflows. |
| `ghost check` | Run active `ghost.checks/v1` deterministic gates against a diff. |
| `ghost review` | Emit an evidence-routed advisory review packet. |
| `ghost compare` | Pairwise or composite comparison over bundles or direct fingerprints. |
| `ghost ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost track` | Shift the tracked fingerprint. |
| `ghost diverge` | Declare intentional divergence on a dimension. |
| `ghost emit <kind>` | Emit `review-command` or `context-bundle`. |
| `ghost skill install` | Install the unified `ghost` agentskills.io bundle. |

`ghost scan --format json` is deterministic handoff state for the host agent.
It does not run an LLM.

## Public Exports

- `@anarchitecture/ghost` for the combined surface.
- `@anarchitecture/ghost/scan` for scan and bundle helpers.
- `@anarchitecture/ghost/drift` for check/review/compare/stance helpers.
- `@anarchitecture/ghost/core` for shared schemas, types, and loaders.
- `@anarchitecture/ghost/cli` for `buildCli()`.

## Environment Variables

No API key is required to run Ghost. Optional variables:

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` are consumed only by semantic embedding
  helpers when a host opts into enriched comparison.
- `GITHUB_TOKEN` helps resolve tracked fingerprints from GitHub without rate
  limit surprises.

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
`major` for removed or renamed public behavior. For this PR 81 package-shape
change, the source version stays `0.0.0` and the changeset is `minor` so the
first publish becomes `0.1.0`.

## Conventions

- Keep publishable runtime code self-contained in `packages/ghost`; no
  `workspace:*` runtime dependencies in the packed public artifact.
- The canonical on-disk form is `.ghost/fingerprint.yml` plus optional
  `.ghost/checks.yml`, `.ghost/proposals/`, `.ghost/decisions/`,
  `.ghost/intent.md`, and `.ghost/cache/`.
- Direct `fingerprint.md` remains only for legacy/direct compare and explicit
  `--fingerprint` emit flows.
- Skill recipes live in `packages/ghost/src/skill-bundle/references/`; install
  them with `ghost skill install`.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is generated
  by `pnpm dump:cli-help`. Re-run it after adding, removing, or renaming CLI
  commands or flags.
