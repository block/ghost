# Ghost

**Ghost keeps repo-local product experience memory for AI agents.**

Agents can write UI. What they cannot reliably preserve is the product
experience identity behind that UI: hierarchy, density, restraint, behavior,
copy, accessibility, trust, and flow. Ghost stores that memory in a versioned
`.ghost/` bundle that agents can read before generation and validate after
changes.

The canonical bundle is intentionally small:

- **`.ghost/fingerprint.yml`** is the source of truth for product experience
  memory: summary, topology, situations, principles, experience contracts,
  patterns, implementation vocabulary, and review policy.
- **`.ghost/config.yml`** optionally records implementation roots and
  reference registries/libraries so agents know where to look without treating
  reference defaults as product intent.
- **`.ghost/checks.yml`** optionally stores deterministic gates grounded in
  fingerprint memory.
- **`.ghost/intent.md`** optionally records human-authored or human-approved
  product intent.
- **`.ghost/decisions/*.yml`** optionally records accepted/rejected
  product-experience rationale.
- **`.ghost/proposals/*.yml`** stages missing memory, intentional divergence,
  experience gaps, and check candidates before human promotion.
- **`.ghost/cache/`** may hold generated inventory. Cache answers what exists;
  `fingerprint.yml` answers what matters and why.

Older `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` artifacts are
legacy/cache material. They are not canonical Ghost memory.

Ghost also supports nested memory for real product surfaces. A repo may keep a
root `.ghost/` for broad product identity and a child bundle such as
`apps/checkout/.ghost/` for local checkout rules. For a file under
`apps/checkout`, Ghost resolves layers from root to leaf, merges them with
child entries winning by `id`, and normalizes child-relative paths back to the
repo root for routing and reports.

Host tools can wrap Ghost without adopting the default directory name. Use
`--memory-dir <relative-dir>` on stack-aware commands to resolve memory from a
safe relative directory such as `.design/memory`; use `--package <dir>` only for
exact single-bundle mode.

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
Capture a Ghost fingerprint for this repo.
Brief this work from the Ghost fingerprint.
Review this PR for Ghost drift.
Compare these two Ghost bundles.
```

## Fingerprint Capture

Fingerprint Capture is a BYOA workflow. Your agent reads, interprets, and
writes the memory artifacts; the CLI supplies deterministic status,
validation, checks, emitted prompts, and review packets.

Ask your agent:

```text
Capture a Ghost fingerprint for this repo.
```

During capture, the agent checkpoints with commands like:

```bash
ghost init --with-intent
ghost init --with-config --reference packages/ghost-ui/.ghost
ghost init --scope apps/checkout --with-intent
ghost init --scope apps/checkout --memory-dir .design/memory
ghost scan --format json
ghost scan --include-nested --format json
ghost inventory > .ghost/cache/inventory.json
ghost lint .ghost
ghost verify .ghost --root .
ghost lint --all
ghost verify --all
```

For Ghost UI, `--reference packages/ghost-ui/.ghost` writes config that points
at `registry:packages/ghost-ui/public/r/registry.json` plus the Ghost UI
reference fingerprint. It does not create or require an installable Ghost UI
package.

Inventory is optional source material. Durable conclusions belong in
`.ghost/fingerprint.yml`; implementation routing belongs in optional
`.ghost/config.yml`; executable gates belong in `.ghost/checks.yml`.

## Drift Workflow

```bash
ghost check --base main
ghost review --base main --include-memory
ghost stack apps/checkout/review/page.tsx
ghost emit review-command
ghost emit review-command --path apps/checkout/review/page.tsx
ghost emit context-bundle
ghost compare market/.ghost dashboard/.ghost
ghost compare a.md b.md --semantic          # legacy direct markdown compare
ghost ack --stance aligned --reason "Initial baseline"
ghost diverge typography --reason "Editorial product uses a different type scale"
```

`ghost scan --format json` emits deterministic capture state: whether
`fingerprint.yml` is present, whether memory has accepted entries, which
optional files exist, and what the next BYOA step should be. It does not call an
LLM.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/{fingerprint.yml,checks.yml,proposals/,cache/}`; use `--scope <path>` for scoped memory and `--memory-dir` for a non-default memory directory. |
| `ghost scan` | Report fingerprint capture progress and, with `--include-nested`, nested bundle readiness. Supports `--memory-dir`. |
| `ghost inventory` | Emit raw repo signals as JSON for optional cache/material gathering. |
| `ghost lint` | Validate a bundle or individual artifact; `--all` validates nested bundles and stack merges. Supports `--memory-dir`. |
| `ghost verify` | Validate fingerprint evidence paths, typed check refs, optional memory, and with `--all` nested stack integrity. Supports `--memory-dir`. |
| `ghost stack` | Inspect resolved root-to-leaf memory layers and merged output for one or more paths. Supports `--memory-dir`. |
| `ghost describe` | Print optional `intent.md` or legacy direct markdown section ranges. |
| `ghost diff` | Structural prose-level diff between legacy direct fingerprints. |
| `ghost survey <op>` | Legacy/cache helpers for `ghost.survey/v2` files. Not canonical memory. |
| `ghost check` | Run active `ghost.checks/v1` gates against a diff, grouping changed files by memory stack unless `--package` is provided. `--format json` emits `ghost.check-report/v1` for wrappers. |
| `ghost review` | Emit an evidence-routed advisory packet with `stacks[]` unless `--package` is provided. Supports `--memory-dir`. |
| `ghost proposal <op>` | Create, list, or resolve scoped proposal files without auto-promoting canonical memory. Supports `--memory-dir`. |
| `ghost compare` | Pairwise or composite comparison over bundles or direct fingerprints. |
| `ghost ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost track` | Shift the tracked fingerprint. |
| `ghost diverge` | Declare intentional divergence on a dimension. |
| `ghost emit <kind>` | Emit `review-command` or `context-bundle`; use `--path` for a merged stack or `--package` for exact bundle mode. Supports `--memory-dir` with `--path`. |
| `ghost skill install` | Install the unified `ghost` agentskills.io bundle. |

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages remain only for historical/development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | Unified public package. Ships the `ghost` CLI, fingerprint capture helpers, deterministic checks, advisory review packets, comparison, stance tracking, and the unified skill bundle. | yes: `@anarchitecture/ghost` |
| [`packages/ghost-core`](./packages/ghost-core) | Private historical shared library. Runtime code is folded into `packages/ghost` for publishing. | no |
| [`packages/ghost-scan`](./packages/ghost-scan) | Private historical scan package. Runtime code is folded into `packages/ghost` for publishing. | no |
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
| [docs/host-adapters.md](./docs/host-adapters.md) | Adapter-neutral JSON, severity mapping, proposals, and custom memory directories |
| [GOVERNANCE.md](./GOVERNANCE.md) | Project governance |
| [LICENSE](./LICENSE) | Apache License, Version 2.0 |
