# Ghost

**Ghost is a product-experience world model for AI agents.**

Agents can write UI. What they cannot reliably preserve is the
product-experience world that UI belongs to: hierarchy, density, restraint,
behavior, copy, accessibility, trust, and flow. Traditional design systems give
humans parts, rules, and examples. Ghost stores the upstream product judgment
agents need around those parts in a versioned `.ghost/` bundle they can read
before generation and validate after changes.

The MVP rule is intentionally small:

- **`.ghost/fingerprint/`** is the checked-in portable fingerprint package.
- **`fingerprint/manifest.yml`** anchors the package (`ghost.fingerprint-package/v1`).
- **`fingerprint/prose.yml`, `fingerprint/inventory.yml`, and
  `fingerprint/composition.yml`** are the three core model files.
- **Generation uses prose + inventory + composition.** Prose explains what
  matters and why, inventory points to the building blocks and precedents an
  agent can inspect or use, and composition explains how those blocks become
  experience.
- **`fingerprint/enforcement/checks.yml`** is optional deterministic
  enforcement grounded in fingerprint refs.
- **Git is the approval boundary.** Uncommitted or unmerged edits are draft
  work; checked-in `fingerprint/` core files are canonical truth for Ghost.

`fingerprint/` starts with a tiny manifest and sparse raw layer files:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

Add only the sections that contain real layer content. Ghost normalizes omitted
layer files or sections internally, so agents and checks still receive the full
assembled `ghost.fingerprint/v1` shape they expect.

Ghost is not a design-system generator, design-system registry, fingerprint lifecycle
manager, proposal system, or screenshot archive. It is a small repo-local
contract agents can read before work and deterministic tooling can validate
after work.

Optional material can sit beside the core files:

- **`.ghost/config.yml`** routes implementation roots and reference
  registries/libraries without becoming portable product memory.
- **`.ghost/fingerprint/memory/intent.md`** records human-authored or
  human-approved product intent when useful.
- **`.ghost/fingerprint/memory/decisions/*.yml`** records accepted/rejected product-experience
  rationale when history matters.
- **`.ghost/fingerprint/sources/cache/`** holds generated cache only after you
  explicitly create it. Generated cache is optional source material: it answers
  what exists; curated `inventory.yml` is the canonical inventory layer.

Older `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` artifacts are
legacy/cache material. They are not canonical Ghost input.

Advanced workflows can add nested fingerprint packages for product areas, custom
`--memory-dir` locations for host wrappers, optional cache inventory, and fleet
comparison. Those features stay available, but the core loop is just
`fingerprint/`, optional active checks, and Git review.

## Project Status: Beta

Ghost is pre-1.0 and under active development. The CLI, fingerprint schema,
on-disk `.ghost/fingerprint/` package shape, and public JavaScript exports may
change in breaking ways before a stable 1.0 release.

Breaking changes may ship in minor versions while Ghost is pre-1.0. Patch
versions are reserved for fixes that should not require migration. If you adopt
Ghost today, expect some churn, pin the version you depend on, and review
release notes before upgrading.

## Install

The public npm package is **`@anarchitecture/ghost`**. It installs one CLI:
**`ghost`**.

```bash
npm install -D @anarchitecture/ghost
npx ghost --help
npx ghost --help --all
```

Default help is intentionally small and shows the core workflow for new
adopters. Use `ghost --help --all` for the complete advanced and legacy command
index; every listed command still supports `ghost <command> --help`.

Install the unified BYOA skill bundle:

```bash
npx ghost skill install
# or choose an explicit destination
npx ghost skill install --dest ~/.codex/skills/ghost
```

Then ask your agent in plain English:

```text
Set up the Ghost fingerprint for this repo.
Brief this work from the Ghost fingerprint.
Review this PR for Ghost drift.
Compare these two Ghost bundles.
```

## Fingerprint Layers

Ghost fingerprints are a BYOA workflow. Your agent reads, interprets, and edits
checked-in prose, inventory, and composition through ordinary file changes.
Generated cache can orient generation, but it does not count as canonical
inventory readiness; active checks validate the result.

Ask your agent:

```text
Set up the Ghost fingerprint for this repo.
```

During setup or fingerprint edits, the agent checkpoints with commands like:

```bash
ghost init
ghost scan --format json
ghost lint .ghost
ghost verify .ghost --root .
```

Use `--with-intent`, `--with-config`, `--reference`, `--scope`, or
`--memory-dir` only when the project needs those advanced files or routing
features.

For Ghost UI, `--reference packages/ghost-ui/.ghost` writes config that points
at `registry:packages/ghost-ui/public/r/registry.json` plus the Ghost UI
reference fingerprint. It does not create or require an installable Ghost UI
package.

Generated cache is optional source material:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory > .ghost/fingerprint/sources/cache/inventory.json
```

Durable conclusions belong in `.ghost/fingerprint/{prose.yml,inventory.yml,composition.yml}`;
executable gates belong in `.ghost/fingerprint/enforcement/checks.yml`;
implementation routing belongs in optional `.ghost/config.yml`.

## Generation Packet

`ghost emit context-bundle` writes the upstream handoff packet for agents before
they generate or revise UI. Give it to Codex, Cursor, Claude, or another host
agent so work starts from prose, inventory, and composition instead of relying on
post-hoc checks. Its `prompt.md` is organized around:

- **Prose** from checked-in `fingerprint/prose.yml`.
- **Inventory** from curated building blocks and exemplars in
  `fingerprint/inventory.yml`, plus
  `.ghost/fingerprint/sources/cache/inventory.json` when present.
- **Composition** from selected `fingerprint/composition.yml` patterns.
- **Active Checks** from `fingerprint/enforcement/checks.yml` for validation,
  not generation input.

Checks and review validate output after generation. They do not replace the
prose, inventory, and composition inputs that help agents produce the right thing.
After implementation, run Ghost review/check against the same fingerprint layers when the
repo workflow supports it.

## Drift Workflow

```bash
ghost check --base main
ghost review --base main --include-memory
ghost emit review-command
ghost emit review-command --path apps/checkout/review/page.tsx
ghost emit context-bundle
```

Advanced commands remain available for scoped fingerprint packages, legacy migration, and
comparison:

```bash
ghost stack apps/checkout/review/page.tsx
ghost compare market/.ghost dashboard/.ghost
ghost compare a.md b.md --semantic          # legacy direct markdown compare
ghost ack --stance aligned --reason "Initial baseline"
ghost diverge typography --reason "Editorial product uses a different type scale"
```

`ghost scan --format json` emits deterministic fingerprint layer state: whether
`fingerprint/manifest.yml` is present, counts for useful `prose`, `inventory`,
and `composition`, missing layers, optional files, and the next BYOA step. A
fingerprint is `fingerprint-ready` only when all three layers have useful
content. It does not call an LLM.

## Core CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/fingerprint/{manifest.yml,prose.yml,inventory.yml,composition.yml,enforcement/checks.yml}`; use options only when optional files or scoped fingerprint packages are needed. |
| `ghost scan` | Report canonical fingerprint layer readiness for prose, inventory, and composition. |
| `ghost lint` | Validate a fingerprint package or individual artifact. |
| `ghost verify` | Validate fingerprint evidence and exemplar paths, typed check refs, and optional rationale files. |
| `ghost check` | Run active `ghost.checks/v1` gates against a diff, grouping changed files by fingerprint stack unless `--package` is provided. `--format json` emits `ghost.check-report/v1` for wrappers. |
| `ghost review` | Emit an evidence-routed advisory packet grounded in fingerprint layers, active checks, and the diff. |
| `ghost emit <kind>` | Emit `review-command` or the `context-bundle` generation packet from checked-in fingerprint layers. |
| `ghost skill install` | Install the unified `ghost` agentskills.io bundle. |

## Advanced And Legacy Commands

| Command | Description |
| --- | --- |
| `ghost inventory` | Emit raw repo signals as JSON for optional cache/material gathering. |
| `ghost stack` | Inspect resolved root-to-leaf fingerprint stack and merged output for one or more paths. Supports `--memory-dir`. |
| `ghost describe` | Print optional `fingerprint/memory/intent.md` or legacy direct markdown section ranges. |
| `ghost diff` | Structural prose-level diff between legacy direct fingerprints. |
| `ghost survey <op>` | Legacy/cache helpers for `ghost.survey/v1` files. Not canonical fingerprint input. |
| `ghost compare` | Pairwise or composite comparison over packages or direct fingerprints. |
| `ghost ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost track` | Shift the tracked fingerprint. |
| `ghost diverge` | Declare intentional divergence on a dimension. |

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages remain only for historical/development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | Unified public package. Ships the `ghost` CLI, fingerprint package helpers, deterministic checks, advisory review packets, advanced comparison/stance helpers, and the unified skill bundle. | yes: `@anarchitecture/ghost` |
| [`packages/ghost-core`](./packages/ghost-core) | Private historical shared library. Runtime code is folded into `packages/ghost` for publishing. | no |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Private fleet view across many members. | no |
| [`packages/ghost-ui`](./packages/ghost-ui) | Reference design system: shadcn registry + `ghost-mcp` MCP server. | no |
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
| [docs/fingerprint-format.md](./docs/fingerprint-format.md) | Root `.ghost/` fingerprint package format |
| [docs/generation-loop.md](./docs/generation-loop.md) | Brief, generate, check, review, and remediate loop |
| [docs/host-adapters.md](./docs/host-adapters.md) | Adapter-neutral JSON, severity mapping, and custom fingerprint directories |
| [GOVERNANCE.md](./GOVERNANCE.md) | Project governance |
| [LICENSE](./LICENSE) | Apache License, Version 2.0 |
