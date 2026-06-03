# Ghost

**Ghost keeps repo-local product experience memory for AI agents.**

Agents can write UI. What they cannot reliably preserve is the product
experience identity behind that UI: hierarchy, density, restraint, behavior,
copy, accessibility, trust, and flow. Ghost stores that memory in a versioned
`.ghost/` bundle that agents can read before generation and validate after
changes.

The MVP rule is intentionally small:

- **`.ghost/fingerprint.yml`** is checked-in product-experience memory.
- **Generation uses prose + inventory + exemplars.** Fingerprint prose explains
  what matters, optional inventory says what exists, and exemplars show what
  good looks like.
- **`.ghost/checks.yml`** is optional deterministic enforcement grounded in
  that memory.
- **Git is the approval boundary.** Uncommitted or unmerged edits are draft
  work; checked-in `fingerprint.yml` memory is canonical truth for Ghost.

`fingerprint.yml` can start sparse:

```yaml
schema: ghost.fingerprint/v1
```

Add only the sections that contain real memory. Ghost normalizes omitted
top-level sections internally, so agents and checks still receive the full
shape they expect.

Ghost is not a memory lifecycle manager, proposal system, design-system
registry, or screenshot archive. It is a small repo-local contract agents can
read before work and deterministic tooling can validate after work.

Optional material can sit beside the core files:

- **`.ghost/config.yml`** routes implementation roots and reference
  registries/libraries without making them product intent.
- **`.ghost/intent.md`** records human-authored or human-approved product
  intent when useful.
- **`.ghost/decisions/*.yml`** records accepted/rejected product-experience
  rationale when history matters.
- **`.ghost/cache/`** holds generated inventory only after you explicitly
  create it. Cache answers what exists; `fingerprint.yml` answers what matters
  and why.

Older `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` artifacts are
legacy/cache material. They are not canonical Ghost memory.

Advanced workflows can add nested memory for product areas, custom
`--memory-dir` locations for host wrappers, optional cache inventory, and fleet
comparison. Those features stay available, but the core loop is just
`fingerprint.yml`, optional active checks, and Git review.

## Install

The public npm package is **`@anarchitecture/ghost`**. It installs one CLI:
**`ghost`**.

```bash
npm install -D @anarchitecture/ghost
npx ghost --help
```

Install the unified BYOA skill bundle:

```bash
npx ghost skill install
# or choose an explicit destination
npx ghost skill install --dest ~/.codex/skills/ghost
```

Then ask your agent in plain English:

```text
Set up Ghost memory for this repo.
Brief this work from the Ghost fingerprint.
Review this PR for Ghost drift.
Compare these two Ghost bundles.
```

## Fingerprint Memory

Fingerprint Memory is a BYOA workflow. Your agent reads, interprets, and edits
checked-in product prose and exemplars through ordinary file changes. Optional
inventory can orient generation; active checks validate the result.

Ask your agent:

```text
Set up Ghost memory for this repo.
```

During setup or memory edits, the agent checkpoints with commands like:

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

Inventory is optional source material:

```bash
mkdir -p .ghost/cache
ghost inventory > .ghost/cache/inventory.json
```

Durable conclusions belong in `.ghost/fingerprint.yml`; executable gates belong
in `.ghost/checks.yml`; implementation routing belongs in optional
`.ghost/config.yml`.

## Generation Packet

`ghost emit context-bundle` writes a portable packet for agents. Its `prompt.md`
is organized around:

- **Product Prose** from checked-in `fingerprint.yml`.
- **Inventory** from `.ghost/cache/inventory.json` when present.
- **Exemplars** from `fingerprint.yml` as curated anchors.
- **Active Checks** from `checks.yml` for validation, not generation memory.

Checks and review validate output after generation. They do not replace the
prose, inventory, and exemplar inputs that help agents produce the right thing.

## Drift Workflow

```bash
ghost check --base main
ghost review --base main --include-memory
ghost emit review-command
ghost emit review-command --path apps/checkout/review/page.tsx
ghost emit context-bundle
```

Advanced commands remain available for scoped memory, legacy migration, and
comparison:

```bash
ghost stack apps/checkout/review/page.tsx
ghost compare market/.ghost dashboard/.ghost
ghost compare a.md b.md --semantic          # legacy direct markdown compare
ghost ack --stance aligned --reason "Initial baseline"
ghost diverge typography --reason "Editorial product uses a different type scale"
```

`ghost scan --format json` emits deterministic memory state: whether
`fingerprint.yml` is present, whether it has product-experience entries, which
optional files exist, and what the next BYOA step should be. It does not call an
LLM.

## Core CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/{fingerprint.yml,checks.yml}`; use options only when optional files or scoped memory are needed. |
| `ghost scan` | Report whether canonical fingerprint memory exists and whether it is ready to guide review. |
| `ghost lint` | Validate a bundle or individual artifact. |
| `ghost verify` | Validate fingerprint evidence and exemplar paths, typed check refs, and optional memory. |
| `ghost check` | Run active `ghost.checks/v1` gates against a diff, grouping changed files by memory stack unless `--package` is provided. `--format json` emits `ghost.check-report/v1` for wrappers. |
| `ghost review` | Emit an evidence-routed advisory packet grounded in fingerprint memory, active checks, and the diff. |
| `ghost emit <kind>` | Emit `review-command` or the `context-bundle` generation packet from checked-in memory. |
| `ghost skill install` | Install the unified `ghost` agentskills.io bundle. |

## Advanced And Legacy Commands

| Command | Description |
| --- | --- |
| `ghost inventory` | Emit raw repo signals as JSON for optional cache/material gathering. |
| `ghost stack` | Inspect resolved root-to-leaf memory layers and merged output for one or more paths. Supports `--memory-dir`. |
| `ghost describe` | Print optional `intent.md` or legacy direct markdown section ranges. |
| `ghost diff` | Structural prose-level diff between legacy direct fingerprints. |
| `ghost survey <op>` | Legacy/cache helpers for `ghost.survey/v2` files. Not canonical memory. |
| `ghost compare` | Pairwise or composite comparison over bundles or direct fingerprints. |
| `ghost ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost track` | Shift the tracked fingerprint. |
| `ghost diverge` | Declare intentional divergence on a dimension. |

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages remain only for historical/development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | Unified public package. Ships the `ghost` CLI, fingerprint memory helpers, deterministic checks, advisory review packets, advanced comparison/stance helpers, and the unified skill bundle. | yes: `@anarchitecture/ghost` |
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
`GITHUB_TOKEN` is optional for resolving tracked fingerprints from GitHub.

## Resources

| Resource | Description |
| --- | --- |
| [docs/fingerprint-format.md](./docs/fingerprint-format.md) | Root `.ghost/` memory format |
| [docs/generation-loop.md](./docs/generation-loop.md) | Brief, generate, check, review, and remediate loop |
| [docs/host-adapters.md](./docs/host-adapters.md) | Adapter-neutral JSON, severity mapping, and custom memory directories |
| [GOVERNANCE.md](./GOVERNANCE.md) | Project governance |
| [LICENSE](./LICENSE) | Apache License, Version 2.0 |
