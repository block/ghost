# Ghost

**Ghost gives agents repo-local design memory for product experience.**

Agents can write UI. What they cannot reliably preserve is the thought behind
the product experience they are changing: hierarchy, density, restraint,
repetition, refusal, reversibility, trust, and flow. Ghost captures that second
layer as a versioned `.ghost/` fingerprint bundle that agents can read before
generation and validate after changes.

The bundle is evidence-first:

- **`.ghost/resources.yml`** declares the references that define the product.
- **`.ghost/map.md`** routes changes to repo scopes and surfaces.
- **`.ghost/survey.json`** records values, tokens, components, surfaces, and factual composition observations.
- **`.ghost/patterns.yml`** codifies repeated composition grammar with evidence.
- **`.ghost/checks.yml`** optionally stores human-promoted deterministic gates.
- **`.ghost/intent.md`** optionally records human-authored or human-approved product intent.
- **`.ghost/decisions/*.yml`** optionally records accepted/rejected product-experience rationale.
- **`.ghost/proposals/*.yml`** optionally stages candidate memory changes before promotion.

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

After that, ask your agent in plain English:

```text
Scan this project with Ghost.
Review this PR for Ghost drift.
Compare these two Ghost bundles.
Brief this work from Ghost memory.
```

## Core Workflow

```bash
# 0. Create the bundle skeleton
ghost init --with-intent

# 1. Ask your agent to map the repo, then validate
ghost inventory
ghost lint .ghost

# 2. Ask your agent to survey values and composition evidence
ghost survey fix-ids .ghost/survey.json -o .ghost/survey.json
ghost lint .ghost

# 3. Derive patterns and verify evidence
ghost survey patterns .ghost/survey.json -o .ghost/patterns.yml
ghost verify .ghost --root .
ghost lint .ghost

# 4. Check or review changes
ghost check --base main
ghost review --base main --include-memory

# 5. Compare fingerprints or bundles
ghost compare market/.ghost dashboard/.ghost
ghost compare a.md b.md --semantic
ghost compare before.md after.md --temporal
ghost compare */.ghost

# 6. Record intentional drift
ghost ack --stance aligned --reason "Initial baseline"
ghost track new-tracked.fingerprint.md
ghost diverge typography --reason "Editorial product uses a different type scale"

# 7. Emit derived context
ghost emit review-command
ghost emit context-bundle
```

`ghost scan --format json` emits deterministic BYOA state: which artifacts are
present, which stage is next, and enough structure for the host agent to choose
the next recipe. It does not call an LLM.

## CLI Commands

| Command | Description |
| --- | --- |
| `ghost init` | Create `.ghost/{resources.yml,map.md,survey.json,patterns.yml,checks.yml}`. |
| `ghost scan` | Report scan state and emit the next BYOA handoff. |
| `ghost inventory` | Emit raw repo signals as JSON for map authoring. |
| `ghost lint` | Validate a bundle or individual artifact. |
| `ghost verify` | Validate resource reachability, pattern evidence, checks, and optional memory. |
| `ghost describe` | Print optional `intent.md` or direct markdown section ranges + token estimates. |
| `ghost diff` | Structural prose-level diff between direct fingerprints. |
| `ghost survey <op>` | Operate on `ghost.survey/v2` files: `merge`, `fix-ids`, `summarize`, `catalog`, `patterns`. |
| `ghost check` | Run active `ghost.checks/v1` deterministic gates against a diff. |
| `ghost review` | Emit an evidence-routed advisory review packet. |
| `ghost compare` | Pairwise or composite comparison over bundles or direct fingerprints. |
| `ghost ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost track` | Shift the tracked fingerprint. |
| `ghost diverge` | Declare intentional divergence on a dimension. |
| `ghost emit <kind>` | Emit `review-command` or `context-bundle`. |
| `ghost skill install` | Install the unified `ghost` agentskills.io bundle. |

## Repo Layout

Ghost is a pnpm monorepo. The public package is self-contained for npm; private
workspace packages remain only for historical/development context.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost`](./packages/ghost) | Unified public package. Ships the `ghost` CLI, scan/memory authoring, deterministic checks, advisory review packets, comparison, stance tracking, and the unified skill bundle. | yes: `@anarchitecture/ghost` |
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
| [docs/fingerprint-format.md](./docs/fingerprint-format.md) | Root `.ghost/` bundle format |
| [docs/generation-loop.md](./docs/generation-loop.md) | Generate, check, review, and remediate loop |
| [GOVERNANCE.md](./GOVERNANCE.md) | Project governance |
| [LICENSE](./LICENSE) | Apache License, Version 2.0 |
