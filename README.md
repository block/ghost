# Ghost

**Ghost helps agents keep generated UI aligned with a project's design language.**

Agents can ship UI now. The problem is drift: wrong palette, wrong density, wrong hierarchy, wrong feel. Most repos do not have a clear, local answer to “what should this interface look like?”

Ghost gives the repo that answer. A scan creates three files: `map.md` says where the design system lives, `survey.json` records the values found in source, and `expression.md` is the compact design-language contract agents read for generation and review. Agents do the judgment work; Ghost's CLIs provide deterministic checks, diffs, and comparisons.

## BYOA: bring your own agent

Every Ghost workflow runs in the host agent you already use: Claude Code, Codex, Cursor, Goose, or another agent. Each tool ships an [agentskills.io](https://agentskills.io)-compatible recipe bundle for the interpretive work: profile, review, verify, remediate, or summarize a fleet. The agent reads the files, makes the calls, and writes the outputs. When it needs a reproducible answer, such as schema validation or expression distance, it calls a Ghost CLI.

No API key is required to run any CLI verb. Each tool's `emit skill` verb installs its bundle into your agent.

## The four tools

Ghost is split into one responsibility per tool. A scan produces three artifacts in sequence — `map.md` (map the system) → `survey.json` (survey what exists) → `expression.md` (express what it means) — all owned by `ghost-expression`.

| Tool | Owns | Verbs |
| --- | --- | --- |
| **`ghost-expression`** | the three-stage scan pipeline (`map.md`, `survey.json`, `expression.md`) | `inventory`, `lint`, `verify-profile`, `describe`, `diff`, `survey <op>`, `emit` |
| **`ghost-drift`** | `.ghost/history.jsonl` + `.ghost-sync.json` — drift detection and stance | `compare`, `ack`, `track`, `diverge`, `emit skill` |
| **`ghost-fleet`** | `fleet.md` — read-only view across many `(map.md, expression.md)` members | `members`, `view`, `emit skill` |
| **`ghost-ui`** | A reference design system Ghost dogfoods — 97 shadcn components + an MCP server | (no verbs) |

Scans describe one subject, but they can read more than one source. For example, an app can be the `primary` source while an upstream design-system package acts as a `resolver` for imported tokens. That keeps the expression about the app's actual usage instead of treating the upstream inventory as the app's design language.

`@ghost/core` underneath is a workspace-only library with embedding math, target resolution, skill-bundle loader, and the `ghost.map/v2` + `ghost.survey/v2` schemas the three CLIs share.

## Why Ghost?

Ghost gives agents a few practical abilities:

- **Generate from a local contract**: `expression.md` tells the agent what the design language is before it writes UI.
- **Review changes for drift**: the review and verify recipes compare generated or changed UI against the expression.
- **Compare systems**: `ghost-drift compare` and `ghost-fleet view` show how expressions differ across projects.
- **Record intent**: `ack`, `track`, and `diverge` record whether drift is accepted, tracked against a new reference, or intentionally different.
- **Stay readable**: `expression.md` is Markdown with YAML frontmatter. Humans can review it, agents can use it, and the CLIs can validate and diff it.

## Repo layout

Ghost is a pnpm monorepo. Four tools, one reference design system, one docs site.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost-core`](./packages/ghost-core) | Workspace-only shared library — embedding math, target resolver, skill loader, `ghost.map/v2` + `ghost.survey/v2` schemas. | ❌ private (`@ghost/core`) |
| [`packages/ghost-expression`](./packages/ghost-expression) | The three-stage scan pipeline: `map.md` → `survey.json` → `expression.md`. Authoring, lint, profile verification, describe, diff, survey ops, emit. | ✅ intended-public on npm |
| [`packages/ghost-drift`](./packages/ghost-drift) | Drift detection and stance verbs. | ✅ `ghost-drift` on npm |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Fleet view across many members. | ❌ private |
| [`packages/ghost-ui`](./packages/ghost-ui) | Reference design system: 97 shadcn components + the `ghost-mcp` MCP server. | ❌ private (distributed via shadcn registry, not npm) |
| [`apps/docs`](./apps/docs) | Deployed docs site (`ghost-docs`). | ❌ private |

Dependency flow: `@ghost/core` ← everyone. `ghost-expression` ← `ghost-drift`, `ghost-fleet`. No cycles.

## Quick install

If you just want the design-language scan + emit recipes installed into your host agent — no Node, no pnpm, no build:

```bash
curl -fsSL https://raw.githubusercontent.com/block/ghost/main/install/install.sh | sh
```

The installer detects your agent (`claude` / `cursor` / `codex` / `opencode`), drops the `ghost` skill bundle into the right skills directory (e.g. `~/.claude/skills/ghost/`), and tells you what to do next. Pass `--agent claude` (or `--dest <path>`) to override detection. Re-run with `--force` to upgrade.

After install, in any repo:

```
> Scan this project with ghost
```

The agent walks `map.md` → `survey.json` → `expression.md`, then emits a `/design-review` slash command tuned to your design language. The recipes work without any Ghost CLI on PATH — every CLI-using step has a prose fallback.

If you want the CLI helpers for linting, profile verification, diffing, comparing, and fleet views, install from source instead. See *Getting Started* below.

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 10+

### Install

```bash
pnpm install
pnpm build
```

### Install the skill bundles into your host agent

Each tool ships its own bundle. Install whichever you need.

```bash
ghost-drift emit skill            # → ./.claude/skills/ghost-drift
ghost-expression emit skill       # → ./.claude/skills/ghost-expression
ghost-fleet emit skill            # → ./.claude/skills/ghost-fleet
```

Once a skill is installed, ask your agent in plain English ("profile this design language", "review this PR for drift", "compute the fleet view") and it'll follow the recipe, calling the relevant CLI whenever it needs a reproducible answer.

### Quick start

**1. Map the repo** (the topology stage — pre-req for survey + profile). Ask your host agent to write `map.md`, then validate:

```bash
ghost-expression inventory      # raw signals as JSON (the agent reads this to author map.md)
ghost-expression lint map.md    # validate ./map.md against ghost.map/v2
```

**2. Survey the design values** (the observed evidence stage). Ask your host agent to write `survey.json`, then validate:

```bash
ghost-expression survey fix-ids survey.json -o survey.json
ghost-expression lint survey.json
```

**3. Profile your design system** — ask your host agent to write `expression.md`. It'll follow the `profile` recipe and validate at the end. You validate manually with:

```bash
ghost-expression lint                                   # defaults to ./expression.md
ghost-expression verify-profile expression.md survey.json --root .
ghost-expression lint path/to/expression.md --format json
```

**4. Compare expressions:**

```bash
# Pairwise: per-dimension distance
ghost-drift compare market.expression.md dashboard.expression.md

# Add qualitative interpretation of decisions + palette
ghost-drift compare a.md b.md --semantic

# Add velocity / trajectory (reads .ghost/history.jsonl)
ghost-drift compare before.md after.md --temporal

# Composite (N≥3): pairwise matrix, centroid, clusters — the org expression
ghost-drift compare *.expression.md
```

**5. Track intent toward another expression:**

```bash
ghost-drift ack --stance aligned --reason "Initial baseline"
ghost-drift track new-tracked.expression.md
ghost-drift diverge typography --reason "Editorial product uses a different type scale"
```

**6. Emit derived artifacts** (these all live in `ghost-expression` now — they read your `expression.md`):

```bash
ghost-expression emit review-command     # .claude/commands/design-review.md (per-project slash command)
ghost-expression emit context-bundle     # ghost-context/ (SKILL.md + expression.md + prompt.md + tokens.css)
ghost-expression emit skill              # .claude/skills/ghost-expression (the agentskills.io bundle)
```

**7. Take the fleet elevation** (when you have ≥2 members each with their own `map.md` and `expression.md`):

```bash
ghost-fleet members ./fleet     # list registered members + freshness
ghost-fleet view ./fleet         # emit fleet.md + fleet.json with pairwise matrix, centroid, clusters
```

**Run the docs site locally:**

```bash
just dev
# or: pnpm -F ghost-docs dev
```

## CLI Commands

Verbs are scoped to the tool that owns the artifact. Pure inputs → pure outputs, no API key required.

| Tool | Command | Description |
| --- | --- | --- |
| `ghost-expression` | `inventory` | Emit raw repo signals (manifests, language histogram, registry presence, top-level tree, git remote) as JSON. Feeds the topology recipe. |
| `ghost-expression` | `lint` | Validate artifact shape for `expression.md`, `map.md`, or `survey.json` — auto-detects by extension/content. |
| `ghost-expression` | `verify-profile` | Validate expression-to-survey fidelity after profiling; palette, spacing, typography, radii, and shadow posture must be survey-backed, and promoted checks must be calibrated. |
| `ghost-expression` | `describe` | Print section ranges + token estimates so agents can selectively load. |
| `ghost-expression` | `diff` | Structural prose-level diff between two expressions (NOT vector distance — for that, use `ghost-drift compare`). |
| `ghost-expression` | `survey <op>` | Operate on `ghost.survey/v2` files. Ops: `merge`, `fix-ids`, `summarize`, `catalog`. |
| `ghost-expression` | `emit` | Derive an artifact from `expression.md`: `review-command`, `context-bundle`, or `skill`. |
| `ghost-drift` | `compare` | Pairwise (N=2) or composite (N≥3) over runtime expression embeddings. `--semantic` / `--temporal` add qualitative enrichment. |
| `ghost-drift` | `ack` | Record stance toward the tracked expression in `.ghost-sync.json`. |
| `ghost-drift` | `track` | Shift the tracked expression. |
| `ghost-drift` | `diverge` | Declare intentional divergence on a dimension. |
| `ghost-drift` | `emit skill` | Install the `ghost-drift` agentskills.io bundle. |
| `ghost-fleet` | `members` | List registered fleet members + freshness. |
| `ghost-fleet` | `view` | Compute pairwise distances + group-by tables; emit `fleet.md` + `fleet.json`. |
| `ghost-fleet` | `emit skill` | Install the `ghost-fleet` agentskills.io bundle. |

### Skill recipes: run by the host agent

The interpretive work is done by recipes the agent runs. Install the relevant bundle once, then ask in plain English. Each tool ships its own recipes.

| Recipe | Bundle | Capability | Triggered by |
| --- | --- | --- | --- |
| `map`       | `ghost-expression` | Author the topology card (stage 1) | "map this repo", "write map.md" |
| `survey`    | `ghost-expression` | Author the survey of values (stage 2) | "survey design values", "extract design tokens" |
| `profile`   | `ghost-expression` | Author the design language (stage 3) | "profile this design language", "write expression.md" |
| `review`    | `ghost-drift` | Review PR changes for drift | "review this PR for drift" |
| `verify`    | `ghost-drift` | Check generated UI against the expression | "verify generated UI against the expression" |
| `compare`   | `ghost-drift` | Compare expressions | "why did these two expressions drift?" |
| `remediate` | `ghost-drift` | Suggest minimal fixes for drift | "fix this drift" |
| `target`    | `ghost-fleet` | Synthesize fleet narrative | "describe this fleet" |

These are instructions, not code. The agent executes them using its normal tools (file search, reading, editing) plus the relevant Ghost CLI when it needs a reproducible answer. (`discover` and `generate` are intentionally not migrated — see [`docs/ideas/phase-0-decisions.md`](./docs/ideas/phase-0-decisions.md).)

## Configuration

`ghost.config.ts` is optional — only `ghost-drift ack` and `ghost-drift diverge` consult it (to locate the tracked expression). Everything else is zero-config.

### Environment variables

- `OPENAI_API_KEY` / `VOYAGE_API_KEY`: optional, consumed by `computeSemanticEmbedding` (a `@ghost/core` library function) when a host wants enriched runtime embeddings.
- `GITHUB_TOKEN`: optional, used by `resolveTrackedExpression` when fetching a tracked expression from GitHub (avoids rate limits).

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## How It Works

### The expression

What the agent reads when it writes or reviews UI. The main file is **`expression.md`** (owned by `ghost-expression`): Markdown with YAML frontmatter plus a prose body.

- **Frontmatter**: `references`, palette, spacing, typography, surfaces, and promoted `checks[]`.
- **`# Character`**: what the design language feels like.
- **`# Signature`**: what output should look like when the language comes together.
- **`# Decisions`**: the important design choices, with evidence. Runtime comparison computes embeddings from this file; no authored embedding file is needed.

Generate one with the `profile` recipe (in the `ghost-expression` skill bundle). See [`docs/expression-format.md`](./docs/expression-format.md) for the full spec.

### The map

What Ghost uses during scan and fleet workflows to understand the repo. **`map.md`** is stage 1 of a scan. It records languages, build system, package manifests, registry files, design-system paths, observable surfaces, and feature areas. Generation and drift review start from `expression.md`, not `map.md`.

Generate one with the `map` recipe (in the `ghost-expression` skill bundle). The agent reads `ghost-expression inventory` (raw repo signals as JSON) and writes the short body.

### Author + Review Loop

The loop is simple: the agent writes UI, the review or verify recipe checks it against `expression.md`, and a human or agent decides what to do next. Fix the drift, accept it, track a new expression, or mark one dimension as intentionally different. See [`docs/generation-loop.md`](./docs/generation-loop.md) for details.

### Remediation

Three files record what happened:

- **`expression.md`**: The design-language contract.
- **`.ghost-sync.json`**: Per-dimension stances toward the tracked expression (aligned, accepted, or diverging), each with recorded reasoning. Written by `ghost-drift ack` / `track` / `diverge`.
- **`.ghost/history.jsonl`**: Append-only expression history for temporal analysis. Read by `ghost-drift compare --temporal`.

### Org-scale observability

To look across many projects:

- **Many expressions, no map**: run `ghost-drift compare` with three or more `expression.md` files. It returns pairwise distances, a centroid, and similarity clusters.
- **A registered fleet** (members each with `map.md` + `expression.md`): run `ghost-fleet view`. It adds groupings such as platform, build system, and design-system status.

## Project Resources

| Resource                             | Description                 |
| ------------------------------------ | --------------------------- |
| [CODEOWNERS](./CODEOWNERS)           | Project lead(s)             |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute           |
| [GOVERNANCE.md](./GOVERNANCE.md)     | Project governance          |
| [LICENSE](./LICENSE)                 | Apache License, Version 2.0 |
