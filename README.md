# Ghost

**Ghost captures the composition of a product surface: the intent behind it,
the materials it draws from, and the patterns that make it feel intentional.**

Ghost gives AI agents a checked-in product fingerprint they can read before
they generate UI and validate after they change it. The public package is
`@anarchitecture/ghost`, and it installs one CLI: `ghost`.

Agents can assemble components. What they need help preserving is the product
surface behind those components: hierarchy, density, restraint, behavior, copy,
accessibility, trust, and flow. Ghost keeps that surface composition in a
portable `.ghost/fingerprint/` package that ordinary Git review can approve.

## The Shape

The canonical package is intentionally small:

```text
.ghost/
  config.yml                    # optional local routing, not portable context
  fingerprint/
    manifest.yml                # ghost.fingerprint-package/v1 anchor
    intent.yml                   # surface intent
    inventory.yml               # curated material and exemplars
    composition.yml             # patterns, flows, states, and arrangements
    validate.yml                  # optional deterministic gates
```

A package can be sparse: it contributes whichever facets are locally true. Generation usually uses intent + inventory + composition:

- `intent.yml` says what the surface is trying to do and for whom.
- `inventory.yml` points agents at materials they can inspect or reuse.
- `composition.yml` captures the patterns that make those materials feel like
  one intentional product.

`validate.yml`, nested packages, custom host-wrapper package locations, and raw repo
signals are supporting features. They do not replace curated fingerprint
facets. `ghost signals` answers what exists; curated fingerprint facets answer
what the surface is trying to preserve.

Older `resources.yml`, `map.md`, `survey.json`, `patterns.yml`, and direct
`fingerprint.yml` artifacts can still inform migration workflows, but new Ghost
work should target `.ghost/fingerprint/`.

## Project Status: Beta

> [!WARNING]
> Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
> on-disk `.ghost/fingerprint/` package shape, and public JavaScript exports may
> change in breaking ways before a stable 1.0 release.
>
> Breaking changes may ship in minor versions while Ghost is pre-1.0. Patch
> versions are reserved for fixes that should not require migration. If you adopt
> Ghost today, expect some churn, pin the version you depend on, and review
> release notes before upgrading.

## Install

```bash
npm install -D @anarchitecture/ghost
npx ghost --help
npx ghost --help --all
```

`ghost --help` shows the core workflow. `ghost --help --all` shows the complete
command index, and each command supports `ghost <command> --help`.

Install the BYOA skill bundle so Codex, Claude, Cursor, Goose, or another host
agent knows how to author and use the fingerprint:

```bash
npx ghost skill install
# or choose an explicit destination
npx ghost skill install --dest ~/.codex/skills/ghost
```

Then ask your agent in plain English:

```text
Set up the Ghost fingerprint for this repo.
Brief this work from the Ghost fingerprint.
Review this PR against the Ghost fingerprint.
Compare these two Ghost bundles.
```

## Author A Fingerprint

Ghost authoring is a human-plus-agent workflow. The CLI creates, inspects, and
validates the package; the host agent interviews, reads the repo, drafts facet
edits, and asks you to curate the claims.

```bash
ghost init
ghost scan --format json
ghost signals .
ghost lint .ghost
ghost verify .ghost --root .
```

Use `--with-config`, `--reference`, or `--scope` only when the repo needs local
routing, reference libraries, or nested product areas.
For monorepos, `ghost init --monorepo` creates or preserves the root package,
detects workspace child roots, and prints proposed `ghost init --scope ...`
commands by default. Run `ghost init --monorepo --apply` to create the detected
child packages. Host wrappers that need Ghost files somewhere other than
`.ghost` may set `GHOST_MEMORY_DIR=<relative-dir>` on the child `ghost` process,
or pass `--memory-dir <relative-dir>` explicitly. Explicit `init [dir]` and
`--memory-dir <relative-dir>` values win over the environment default.

Drafted fingerprint edits are just ordinary file changes until Git review
accepts them. Checked-in `fingerprint/` facet files are the Ghost source of
truth.

## Generate From Ghost

Before generating or revising UI, gather the Relay brief for the target path:

```bash
ghost relay gather apps/checkout/review/page.tsx
```

Relay compiles the resolved cascade into package chain, intent cascade, active
obligations, composition guidance, inventory to inspect, validation checks, and
gaps. The important shift is timing: Ghost gives agents surface-composition
context before they build, not only after a review finds drift.

After implementation, run the deterministic and advisory workflows against the
same fingerprint:

```bash
ghost check --base main
ghost review --base main
```

`ghost check` runs active `ghost.validate/v1` gates and can fail. `ghost review`
emits an evidence-routed advisory packet for a human or host adapter to use.

## Compare And Govern

Advanced workflows remain available when a repo needs package stacks,
comparison, or explicit drift stance:

```bash
ghost stack apps/checkout/review/page.tsx
ghost compare market/.ghost dashboard/.ghost
ghost ack --stance aligned --reason "Initial baseline"
ghost track new-tracked.fingerprint.md
ghost diverge typography --reason "Editorial product uses a different type scale"
ghost emit review-command --path apps/checkout/review/page.tsx
```

`ghost scan --format json` emits deterministic contribution state for `intent`,
`inventory`, `composition`, and `validate`. A sparse package can be useful with
only one contributing facet; absent facets may be inherited from broader stack
context. It does not call an LLM.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/fingerprint/` package facet files. |
| `ghost scan` | Report sparse fingerprint contribution facets. |
| `ghost lint` | Validate a fingerprint package or individual artifact. |
| `ghost verify` | Validate evidence paths, exemplar paths, and typed check refs. |
| `ghost check` | Run active deterministic gates against a diff. |
| `ghost review` | Emit an evidence-routed advisory packet from fingerprint facets and a diff. |
| `ghost relay gather` | Gather fingerprint-grounded context for an agent target. |
| `ghost emit <kind>` | Emit `review-command` artifacts. |
| `ghost skill install` | Install the unified Ghost skill bundle. |
| `ghost stack` | Inspect resolved root-to-leaf fingerprint stacks. |
| `ghost signals` | Emit raw repo signals as JSON for fingerprint authoring. |
| `ghost describe` | Print markdown section ranges. |
| `ghost compare` | Compare fingerprint packages. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |
| `ghost diff` / `survey` | Maintain direct markdown fingerprints or survey/cache files for compatibility workflows. |

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages remain development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | Public package. Ships the `ghost` CLI, fingerprint package helpers, deterministic checks, advisory review packets, comparison/stance helpers, and the unified skill bundle. | yes: `@anarchitecture/ghost` |
| [`packages/ghost-core`](./packages/ghost-core) | Private historical shared library. Runtime code needed for npm is folded into `packages/ghost`. | no |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Private fleet view across many Ghost bundles. | no |
| [`packages/ghost-ui`](./packages/ghost-ui) | Reference design system: shadcn registry plus `ghost-mcp` MCP server. | no |
| [`apps/docs`](./apps/docs) | Docs site. | no |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check
pnpm dump:cli-help
pnpm --filter @anarchitecture/ghost pack
```

No API key is required to run Ghost. `OPENAI_API_KEY` / `VOYAGE_API_KEY` are
optional and only used by semantic embedding helpers when a host opts in.

## Resources

| Resource | Description |
| --- | --- |
| [docs/fingerprint-format.md](./docs/fingerprint-format.md) | Portable `.ghost/fingerprint/` package format. |
| [docs/generation-loop.md](./docs/generation-loop.md) | Brief, generate, check, review, and remediate loop. |
| [docs/language-fingerprints.md](./docs/language-fingerprints.md) | Voice and language capture through existing fingerprint facets. |
| [docs/host-adapters.md](./docs/host-adapters.md) | Adapter-neutral JSON, severity mapping, and custom fingerprint directories. |
| [docs/ghost-fleet.md](./docs/ghost-fleet.md) | Current private fleet package model. |
| [GOVERNANCE.md](./GOVERNANCE.md) | Project governance. |
| [LICENSE](./LICENSE) | Apache License, Version 2.0. |
