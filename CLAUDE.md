# Ghost

Agents can assemble UI. What they cannot reliably preserve is the product
surface composition behind that UI: hierarchy, density, restraint, repetition,
trust, flow, and the choices that make a surface feel intentional.

Ghost keeps that surface composition in a repo-local `.ghost/` fingerprint package. The public npm shape
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
calculator the agent reaches for: schema validation, repo-signal helpers,
structural diffs, drift checks, comparison math, and handoff packets.

The canonical root `.ghost/` package follows:

```text
config.yml
fingerprint/
  manifest.yml
  intent.yml
  inventory.yml
  composition.yml
  validate.yml
```

The three root facet files under `fingerprint/` are the core model:

- `intent.yml` for surface intent.
- `inventory.yml` for curated material, exemplars, and source links.
- `composition.yml` for experience patterns.

`validate.yml` validates output through deterministic checks; it is not
generation input.
`.ghost/config.yml` remains local adapter/routing config outside portable
context. Ordinary Git review is the approval boundary for fingerprint edits.

Legacy `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` may still
appear in older repos or as migration source material. They are not canonical
fingerprint input for new Ghost work.

## Packages

| Package | Published? | Description |
| --- | --- | --- |
| `packages/ghost` | yes: `@anarchitecture/ghost` | Unified public package. Ships the `ghost` CLI, fingerprint package authoring, checks, advisory review packets, comparison, drift stance verbs, and the unified skill bundle. |
| `packages/ghost-core` | no | Private historical shared package. Runtime code needed by npm is folded into `packages/ghost/src/ghost-core`. |
| `packages/ghost-fleet` | no | Private fleet view across many Ghost bundles. Consumes workspace exports from `@anarchitecture/ghost`. |
| `packages/ghost-ui` | no | Reference design system: shadcn registry plus `ghost-mcp` MCP server. |
| `apps/docs` | no | Docs site. |

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/fingerprint/` with manifest, facets, and deterministic checks. |
| `ghost scan` | Report fingerprint contribution facets and BYOA next-step guidance. |
| `ghost signals` | Emit raw repo signals as JSON for fingerprint authoring. |
| `ghost lint` | Validate a fingerprint package or single artifact. |
| `ghost verify` | Validate fingerprint evidence and exemplar paths, and typed check refs. |
| `ghost describe` | Print direct markdown section ranges. |
| `ghost diff` | Structural direct-fingerprint prose diff between direct fingerprints. |
| `ghost survey <op>` | Legacy survey helpers for optional `ghost.survey/v1` workflows. |
| `ghost check` | Run active `ghost.validate/v1` deterministic gates against a diff. |
| `ghost review` | Emit an evidence-routed advisory review packet grounded in fingerprint facets, inventory exemplars, checks, and the diff. |
| `ghost compare` | Pairwise or composite comparison over packages or direct fingerprints. |
| `ghost ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost track` | Shift the tracked fingerprint. |
| `ghost diverge` | Declare intentional divergence on a dimension. |
| `ghost emit <kind>` | Emit `review-command`. |
| `ghost skill install` | Install the unified `ghost` agentskills.io bundle. |

`ghost scan --format json` is deterministic contribution and source-signal state.
It does not run an LLM.

## Public Exports

- `@anarchitecture/ghost` for the combined surface.
- `@anarchitecture/ghost/scan` for scan contribution, source signals, and stack discovery.
- `@anarchitecture/ghost/fingerprint` for fingerprint package authoring, linting, verification, parsing, and serialization.
- `@anarchitecture/ghost/drift` for check/review/compare/stance helpers.
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
`major` for removed or renamed public behavior. For this PR 81 package-shape
change, the source version stays `0.0.0` and the changeset is `minor` so the
first publish becomes `0.1.0`.

## Conventions

- Keep publishable runtime code self-contained in `packages/ghost`; no
  `workspace:*` runtime dependencies in the packed public artifact.
- The canonical on-disk form is `.ghost/fingerprint/` plus optional
  `.ghost/config.yml`.
- Direct `fingerprint.md` remains only for legacy/direct compare workflows.
- Skill recipes live in `packages/ghost/src/skill-bundle/references/`; install
  them with `ghost skill install`.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is generated
  by `pnpm dump:cli-help`. Re-run it after adding, removing, or renaming CLI
  commands or flags.
