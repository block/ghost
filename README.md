# Ghost

**Ghost gives agents a repo-local fingerprint for preserving product identity while they write UI.**

Agents can write UI. What they cannot reliably preserve is the identity of the product that UI belongs to.

The failure mode is structural. Large language models generate by matching local patterns. They reproduce components, tokens, and layouts, but they do not consistently preserve the higher-order decisions that make a surface feel intentional: hierarchy, density, restraint, repetition, and refusal.

Most design systems encode product inventory: colors, type scales, components. That inventory is necessary, but not sufficient. The same system can produce many different products. What is missing is the policy that governs how those parts are composed.

Ghost introduces that second layer as a repository-local, versioned fingerprint. It captures the product's composition policy — the constraints, preferences, recurring decisions, and anti-patterns that shape how the system is actually used. It does not replace the design system; it conditions it.

The scan earns that package with evidence:

- **`.ghost/resources.yml`** declares the references that define the product.
- **`.ghost/map.md`** routes changes to repo scopes and surfaces.
- **`.ghost/survey.json`** records values, tokens, components, surfaces, and factual composition observations.
- **`.ghost/patterns.yml`** codifies repeated composition grammar with evidence.
- **`.ghost/checks.yml`** optionally stores human-promoted deterministic gates.
- **`.ghost/intent.md`** optionally records human-authored or human-approved product intent.

Specs describe what exists. The fingerprint bundle describes how the product repeatedly chooses to use what exists. Survey grounds it; patterns operationalize composition; optional checks fail builds; optional intent preserves the human voice.

## Works with your agent

Every Ghost workflow runs in the host agent you already use: Claude Code, Codex, Cursor, Goose, or another agent. Each tool ships an [agentskills.io](https://agentskills.io)-compatible recipe bundle for work like scan, review, verify, remediate, or summarize a fleet. The agent reads the files, makes the calls, and writes the outputs. When it needs a reproducible answer, such as schema validation or fingerprint distance, it calls a Ghost CLI.

No API key is required to run any CLI verb. Each tool's `emit skill` verb installs its bundle into your agent.

## Why Ghost?

Ghost gives agents a few practical abilities:

- **Generate from repo-local memory**: `.ghost/patterns.yml`, `.ghost/survey.json`, and optional `.ghost/intent.md` tell the agent how the product composes UI before it writes.
- **Fail deterministic drift**: `ghost-drift check` applies active `checks.yml` gates to a diff.
- **Review changes with evidence**: `ghost-drift review` emits an advisory packet grounded in patterns, survey, optional intent, checks, and diff.
- **Compare systems**: `ghost-drift compare` and `ghost-fleet view` show how fingerprints differ across projects.
- **Record intent**: `ack`, `track`, and `diverge` record whether drift is accepted, tracked against a new reference, or intentionally different.
- **Stay readable**: `map.md` and optional `intent.md` are Markdown, `survey.json` is factual evidence, `patterns.yml` is operational grammar, and `checks.yml` is the human-curated gate layer.

## Tools around the loop

Ghost is split into focused tools. The common path is simple:

```text
.ghost/resources.yml -> map.md -> survey.json -> patterns.yml -> check/review
```

| Tool | Job | Verbs |
| --- | --- | --- |
| **`ghost-fingerprint`** | Create and check the root `.ghost/` bundle. | `init-package`, `inventory`, `lint`, `verify`, `describe`, `diff`, `survey <op>`, `emit` |
| **`ghost-drift`** | Run deterministic checks, emit advisory review packets, compare fingerprints, and record what changed intentionally. | `check`, `review`, `compare`, `ack`, `track`, `diverge`, `emit skill` |
| **`ghost-fleet`** | See how many project fingerprints relate. | `members`, `view`, `emit skill` |
| **`ghost-ui`** | Reference design system Ghost dogfoods — 97 shadcn components + an MCP server. | (no verbs) |

Scans describe one subject, but they can read more than one source. For example, an app can read tokens from an upstream design-system package while still producing a fingerprint about the app's actual UI.

`@ghost/core` underneath is a workspace-only library with embedding math, target resolution, skill-bundle loader, and the `ghost.map/v2` + `ghost.survey/v2` schemas the three CLIs share.

## Repo layout

Ghost is a pnpm monorepo. Four tools, one reference design system, one docs site.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost-core`](./packages/ghost-core) | Workspace-only shared library — embedding math, target resolver, skill loader, `ghost.resources/v1`, `ghost.map/v2`, `ghost.survey/v2`, `ghost.patterns/v1`, and `ghost.checks/v1` schemas. | ❌ private (`@ghost/core`) |
| [`packages/ghost-fingerprint`](./packages/ghost-fingerprint) | The root bundle pipeline: `.ghost/{resources.yml,map.md,survey.json,patterns.yml}` plus optional checks and intent. Authoring, lint, verify, describe, diff, survey ops, emit. | ✅ intended-public on npm |
| [`packages/ghost-drift`](./packages/ghost-drift) | Deterministic check, advisory review, comparison, and stance verbs. | ✅ `ghost-drift` on npm |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Fleet view across many members. | ❌ private |
| [`packages/ghost-ui`](./packages/ghost-ui) | Reference design system: 97 shadcn components + the `ghost-mcp` MCP server. | ❌ private (distributed via shadcn registry, not npm) |
| [`apps/docs`](./apps/docs) | Deployed docs site (`ghost-docs`). | ❌ private |

Dependency flow: `@ghost/core` ← everyone. `ghost-fingerprint` ← `ghost-drift`, `ghost-fleet`. No cycles.

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

The agent walks `.ghost/resources.yml` → `map.md` → `survey.json` → `patterns.yml` + optional `checks.yml` / `intent.md`, then checks or reviews UI changes against that bundle. The recipes work without any Ghost CLI on PATH — every CLI-using step has a prose fallback.

If you want the CLI helpers for linting, fingerprint verification, diffing, comparing, and fleet views, install from source instead. See *Getting Started* below.

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
ghost-fingerprint emit skill       # → ./.claude/skills/ghost-fingerprint
ghost-fleet emit skill            # → ./.claude/skills/ghost-fleet
```

Once a skill is installed, ask your agent in plain English ("scan this project with Ghost", "review this PR for drift", "compute the fleet view") and it'll follow the recipe, calling the relevant CLI whenever it needs a reproducible answer.

### Quick start

**0. Initialize the package**:

```bash
ghost-fingerprint init-package
```

**1. Map the repo**. Ask your host agent to write `.ghost/map.md`, then validate:

```bash
ghost-fingerprint inventory
ghost-fingerprint lint .ghost
```

**2. Survey the design values and composition observations**. Ask your host agent to write `.ghost/survey.json`, then validate:

```bash
ghost-fingerprint survey fix-ids .ghost/survey.json -o .ghost/survey.json
ghost-fingerprint lint .ghost
```

**3. Codify patterns and promote checks** — ask your host agent to write `.ghost/patterns.yml` and propose lintable checks. Humans promote durable gates into `.ghost/checks.yml`:

```bash
ghost-fingerprint survey patterns .ghost/survey.json -o .ghost/patterns.yml
ghost-fingerprint verify .ghost --root .
ghost-fingerprint lint
```

**4. Check or review a diff**:

```bash
ghost-drift check --base main
ghost-drift check --diff change.patch --format json
ghost-drift review --base main
```

**5. Compare fingerprints:**

```bash
# Pairwise: per-dimension distance
ghost-drift compare market/.ghost dashboard/.ghost

# Add qualitative interpretation of decisions + palette
ghost-drift compare a.md b.md --semantic

# Add velocity / trajectory (reads .ghost/history.jsonl)
ghost-drift compare before.md after.md --temporal

# Composite (N≥3): pairwise matrix, centroid, clusters — the org fingerprint
ghost-drift compare */.ghost
```

**6. Track intent toward another fingerprint:**

```bash
ghost-drift ack --stance aligned --reason "Initial baseline"
ghost-drift track new-tracked.fingerprint.md
ghost-drift diverge typography --reason "Editorial product uses a different type scale"
```

**7. Emit derived outputs**:

```bash
ghost-fingerprint emit review-command     # .claude/commands/design-review.md (per-project slash command)
ghost-fingerprint emit context-bundle     # ghost-context/ (SKILL.md + fingerprint context + prompt.md + tokens.css)
ghost-fingerprint emit skill              # .claude/skills/ghost-fingerprint (the agentskills.io bundle)
```

**8. View a fleet** (when you have ≥2 members each with their own package/fingerprint):

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

Commands are grouped by the tool that owns the file. Pure inputs → pure outputs, no API key required.

| Tool | Command | Description |
| --- | --- | --- |
| `ghost-fingerprint` | `inventory` | Emit raw repo signals (manifests, language histogram, registry presence, top-level tree, git remote) as JSON. Feeds the map recipe. |
| `ghost-fingerprint` | `init-package` | Create `.ghost/{resources.yml,map.md,survey.json,patterns.yml,checks.yml}`. |
| `ghost-fingerprint` | `lint` | Validate the fingerprint bundle or an individual artifact. |
| `ghost-fingerprint` | `verify` | Validate cross-artifact fidelity: resources, pattern evidence, and check references. |
| `ghost-fingerprint` | `describe` | Print optional `intent.md` or direct markdown section ranges + token estimates. |
| `ghost-fingerprint` | `diff` | Structural prose-level diff between two fingerprints (NOT vector distance — for that, use `ghost-drift compare`). |
| `ghost-fingerprint` | `survey <op>` | Operate on `ghost.survey/v2` files. Ops: `merge`, `fix-ids`, `summarize`, `catalog`, `patterns`. |
| `ghost-fingerprint` | `emit` | Derive an output from direct fingerprint markdown or install the skill bundle. |
| `ghost-drift` | `check` | Run active `ghost.checks/v1` deterministic gates against a diff; exits nonzero on failures. |
| `ghost-drift` | `review` | Emit an evidence-routed advisory review packet; findings are non-blocking unless tied to active checks. |
| `ghost-drift` | `compare` | Pairwise (N=2) or composite (N≥3) over runtime fingerprint embeddings. `--semantic` / `--temporal` add qualitative enrichment. |
| `ghost-drift` | `ack` | Record stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost-drift` | `track` | Shift the tracked fingerprint. |
| `ghost-drift` | `diverge` | Declare intentional divergence on a dimension. |
| `ghost-drift` | `emit skill` | Install the `ghost-drift` agentskills.io bundle. |
| `ghost-fleet` | `members` | List registered fleet members + freshness. |
| `ghost-fleet` | `view` | Compute pairwise distances + group-by tables; emit `fleet.md` + `fleet.json`. |
| `ghost-fleet` | `emit skill` | Install the `ghost-fleet` agentskills.io bundle. |

### Skill recipes: run by the host agent

The interpretive work is done by recipes the agent runs. Install the relevant bundle once, then ask in plain English. Each tool ships its own recipes.

| Recipe | Bundle | Capability | Triggered by |
| --- | --- | --- | --- |
| `map`       | `ghost-fingerprint` | Write the repo map (stage 1) | "map this repo", "write map.md" |
| `survey`    | `ghost-fingerprint` | Author the survey of values (stage 2) | "survey design values", "extract design tokens" |
| `patterns` | `ghost-fingerprint` | Author operational composition grammar (stage 4) | "write patterns.yml", "codify composition patterns" |
| `review`    | `ghost-drift` | Review PR changes for drift | "review this PR for drift" |
| `verify`    | `ghost-drift` | Check generated UI against the fingerprint | "verify generated UI against the fingerprint" |
| `compare`   | `ghost-drift` | Compare fingerprints | "why did these two fingerprints drift?" |
| `remediate` | `ghost-drift` | Suggest minimal fixes for drift | "fix this drift" |
| `target`    | `ghost-fleet` | Synthesize fleet narrative | "describe this fleet" |

These are instructions, not code. The agent executes them using its normal tools (file search, reading, editing) plus the relevant Ghost CLI when it needs a reproducible answer. (`discover` and `generate` are intentionally not migrated — see [`docs/ideas/phase-0-decisions.md`](./docs/ideas/phase-0-decisions.md).)

## Configuration

`ghost.config.ts` is optional — only `ghost-drift ack` and `ghost-drift diverge` consult it (to locate the tracked fingerprint). Everything else is zero-config.

### Environment variables

- `OPENAI_API_KEY` / `VOYAGE_API_KEY`: optional, consumed by `computeSemanticEmbedding` (a `@ghost/core` library function) when a host wants enriched semantic comparison.
- `GITHUB_TOKEN`: optional, used by `resolveTrackedFingerprint` when fetching a tracked fingerprint from GitHub (avoids rate limits).

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## How It Works

### The fingerprint

What the agent reads when it writes or reviews UI is the **fingerprint bundle**:

- **`map.md`**: where surfaces live and how changed files route to scopes.
- **`survey.json`**: factual observed evidence.
- **`patterns.yml`**: operational composition grammar. It shapes advisory review but never fails CI by itself.
- **`intent.md`**: optional human-authored or human-approved product intent.
- **`checks.yml`**: optional human-promoted enforceable gates. These are the only blocking mechanism in v1.

Generate one with the `scan` and `patterns` recipes (in the `ghost-fingerprint` skill bundle). See [`docs/fingerprint-format.md`](./docs/fingerprint-format.md) for the full spec.

### The map

What Ghost uses during scan and drift workflows to understand the repo. **`.ghost/map.md`** is the topology stage of a scan. It records languages, build system, package manifests, registry files, design-system paths, observable surfaces, feature areas, and scopes. Deterministic drift starts by routing changed files through this map.

Generate one with the `map` recipe (in the `ghost-fingerprint` skill bundle). The agent reads `ghost-fingerprint inventory` (raw repo signals as JSON) and writes the short body.

### Author + Review Loop

The loop is simple: the agent writes UI, `ghost-drift check` fails active gates, `ghost-drift review` provides advisory critique grounded in evidence, and a human or agent decides what to do next. Fix the drift, accept it, track a new fingerprint, or promote a durable rule into `checks.yml`. See [`docs/generation-loop.md`](./docs/generation-loop.md) for details.

### Remediation

Three files record what happened:

- **`.ghost/`**: The repo-local design memory bundle.
- **`.ghost-sync.json`**: Per-dimension stances toward the tracked fingerprint (aligned, accepted, or diverging), each with recorded reasoning. Written by `ghost-drift ack` / `track` / `diverge`.
- **`.ghost/history.jsonl`**: Append-only fingerprint history for temporal analysis. Read by `ghost-drift compare --temporal`.

### Org-scale observability

To look across many projects:

- **Many bundles, no fleet**: run `ghost-drift compare` with three or more `.ghost` bundle directories. It returns pairwise distances, a centroid, and similarity clusters.
- **A registered fleet** (members each with a fingerprint bundle): run `ghost-fleet view`. It adds groupings such as platform, build system, and design-system status.

## Project Resources

| Resource                             | Description                 |
| ------------------------------------ | --------------------------- |
| [CODEOWNERS](./CODEOWNERS)           | Project lead(s)             |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute           |
| [GOVERNANCE.md](./GOVERNANCE.md)     | Project governance          |
| [LICENSE](./LICENSE)                 | Apache License, Version 2.0 |
