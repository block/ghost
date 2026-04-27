# Ghost

**Brand fidelity infrastructure for an agent-authored world. Every generation gets an expression the harness can read, enforce, and check.**

AI is becoming the primary author of shipped code. Humans sit in fewer diffs; the harness (guardrails, reviewers, verifiers) catches drift before it lands. In that world, ensuring every generation reflects a brand's voice is paramount. Fonts and spacing are the easy half. The hard half is character: the posture a product takes, what it refuses to do. That's where generations drift first.

Ghost closes that loop. It captures a brand as an **expression**: a human-readable `expression.md` encoding character, signature traits, and concrete decisions. It gives any agent the primitives to author against it, detect drift the moment it happens, and record the right stance: **acknowledge**, **track**, or **intentionally diverge**. Each repo owns its expression, its trajectory, and its stance. The fleet of expressions drifts in the open. Nothing gets enforced; nothing drifts silently. Deterministic arithmetic lives in Ghost's CLIs; judgment lives in whatever agent you already use.

## BYOA: bring your own agent

Ghost splits the work the way agents need it split: **judgement in the agent, arithmetic in the CLI**.

- **The CLIs**: a set of **deterministic primitives** distributed across five small tools. None of them ever call an LLM. They do vector distance, schema validation, manifest writes. Same answer every time.
- **The skill bundles**: [agentskills.io](https://agentskills.io)-compatible recipes for the interpretive work (profile, review, verify, remediate, fleet narrative). Each tool ships its own; the host agent (Claude Code, Codex, Cursor, Goose, …) runs the recipes and calls the relevant CLI for the arithmetic.

No API key is required to use any CLI verb. Judgment work lives in whichever agent you already use; each tool's `emit skill` verb installs the recipes there.

## The five tools

Ghost is split into one responsibility per tool, around two canonical Markdown artifacts.

| Tool | Owns | Verbs |
| --- | --- | --- |
| **`ghost-map`** | `map.md` — the topology card answering "where is the design system, which folders matter?" | `inventory`, `lint` |
| **`ghost-expression`** | `expression.md` — the canonical design language artifact | `lint`, `describe`, `diff`, `emit` |
| **`ghost-drift`** | `.ghost/history.jsonl` + `.ghost-sync.json` — drift detection and stance | `compare`, `ack`, `track`, `diverge`, `emit skill` |
| **`ghost-fleet`** | `fleet.md` — read-only elevation across many `(map.md, expression.md)` members | `members`, `view`, `emit skill` |
| **`ghost-ui`** | A reference design system Ghost dogfoods — 97 shadcn components + an MCP server | (no verbs) |

`@ghost/core` underneath is a workspace-only library with the embedding math, target resolver, and skill-bundle loader the four CLIs share.

## Why Ghost?

Ghost gives agents four capabilities the design-at-scale problem actually needs:

- **Author against a real quality bar**: `ghost-expression emit context-bundle` and the `generate` recipe turn a design language into grounding an agent can actually follow. The expression is the bar; the agent authors to it.
- **Self-govern at author time**: the `review` and `verify` recipes (in the `ghost-drift` skill bundle) run an agent's output against the expression *before* a human sees it. Drift gets caught where it's cheap to fix, not after it ships.
- **Detect drift at the right time**: PR-time (via `review`), generation-time (via `verify`), or org-time (via `ghost-drift compare` on N≥3 expressions, or `ghost-fleet view` for the full elevation). Timing is load-bearing: the same drift surfaced a month later is noise; surfaced inline, it's action.
- **Remediate with structured intent**: `ack`, `track`, `diverge` are the three moves. Every stance is published with reasoning and full lineage. Drift without intent is noise; drift with intent becomes useful evidence.
- **Human-readable, diff-friendly**: `expression.md` is Markdown with YAML frontmatter (machine layer) plus a three-layer prose body (Character, Signature, Decisions). `map.md` is the same shape for topology. Humans read them, agents consume them, deterministic tools diff them. No DSL to learn.

## Repo layout

Ghost is a pnpm monorepo. Five tools, one reference design system, one docs site.

| Path | Role | Published? |
| ---- | ---- | --- |
| [`packages/ghost-core`](./packages/ghost-core) | Workspace-only shared library — embedding math, types, target resolver, skill loader. | ❌ private (`@ghost/core`) |
| [`packages/ghost-map`](./packages/ghost-map) | `map.md` topology generator + linter. | ❌ private (today) |
| [`packages/ghost-expression`](./packages/ghost-expression) | `expression.md` authoring + emit pipeline. | ✅ intended-public on npm |
| [`packages/ghost-drift`](./packages/ghost-drift) | Drift detection + governance verbs. | ✅ `ghost-drift` on npm |
| [`packages/ghost-fleet`](./packages/ghost-fleet) | Fleet elevation across many members. | ❌ private |
| [`packages/ghost-ui`](./packages/ghost-ui) | Reference design system: 97 shadcn components + the `ghost-mcp` MCP server. | ❌ private (distributed via shadcn registry, not npm) |
| [`apps/docs`](./apps/docs) | Deployed docs site (`ghost-docs`). | ❌ private |

Dependency flow: `@ghost/core` ← everyone. `ghost-expression` ← `ghost-drift`, `ghost-fleet`. `ghost-map` ← `ghost-fleet`. No cycles.

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

Once a skill is installed, ask your agent in plain English ("profile this design language", "review this PR for drift", "compute the fleet view") and it'll follow the recipe, calling the relevant CLI for any deterministic step.

### Quick start

**1. Map the repo** (optional but speeds up everything that follows). Ask your host agent to write `map.md`, then validate:

```bash
ghost-map inventory             # raw signals as JSON (the agent reads this to author map.md)
ghost-map lint                  # validate ./map.md against ghost.map/v1
```

**2. Profile your design system** — ask your host agent to write `expression.md`. It'll follow the `profile` recipe and validate at the end. You validate manually with:

```bash
ghost-expression lint                                   # defaults to ./expression.md
ghost-expression lint path/to/expression.md --format json
```

**3. Compare expressions:**

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

**4. Track intent toward another expression:**

```bash
ghost-drift ack --stance aligned --reason "Initial baseline"
ghost-drift track new-tracked.expression.md
ghost-drift diverge typography --reason "Editorial product uses a different type scale"
```

**5. Emit derived artifacts** (these all live in `ghost-expression` now — they read your `expression.md`):

```bash
ghost-expression emit review-command     # .claude/commands/design-review.md (per-project slash command)
ghost-expression emit context-bundle     # ghost-context/ (SKILL.md + tokens.css + prompt.md)
ghost-expression emit skill              # .claude/skills/ghost-expression (the agentskills.io bundle)
```

**6. Take the fleet elevation** (when you have ≥2 members each with their own `map.md` and `expression.md`):

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

Every verb is a deterministic primitive — pure inputs → pure outputs, no LLM in the loop. Verbs are scoped to the tool that owns the artifact.

| Tool | Command | Description |
| --- | --- | --- |
| `ghost-map` | `inventory` | Emit raw repo signals (manifests, language histogram, registry presence, top-level tree, git remote) as JSON. |
| `ghost-map` | `lint` | Validate `map.md` against `ghost.map/v1`. |
| `ghost-expression` | `lint` | Validate `expression.md` schema + body/frontmatter coherence. |
| `ghost-expression` | `describe` | Print section ranges + token estimates so agents can selectively load. |
| `ghost-expression` | `diff` | Structural prose-level diff between two expressions (NOT vector distance — for that, use `ghost-drift compare`). |
| `ghost-expression` | `emit` | Derive an artifact from `expression.md`: `review-command`, `context-bundle`, or `skill`. |
| `ghost-drift` | `compare` | Pairwise (N=2) or composite (N≥3) over expression embeddings. `--semantic` / `--temporal` add qualitative enrichment. |
| `ghost-drift` | `ack` | Record stance toward the tracked expression in `.ghost-sync.json`. |
| `ghost-drift` | `track` | Shift the tracked expression. |
| `ghost-drift` | `diverge` | Declare intentional divergence on a dimension. |
| `ghost-drift` | `emit skill` | Install the `ghost-drift` agentskills.io bundle. |
| `ghost-fleet` | `members` | List registered fleet members + freshness. |
| `ghost-fleet` | `view` | Compute pairwise distances + group-by tables; emit `fleet.md` + `fleet.json`. |
| `ghost-fleet` | `emit skill` | Install the `ghost-fleet` agentskills.io bundle. |

### Skill recipes: run by the host agent

The interpretive verbs from the pitch (*author, self-govern, detect, remediate*) are recipes the agent runs. Install the relevant bundle once; ask in plain English. Each tool ships its own.

| Recipe | Bundle | Capability | Triggered by |
| --- | --- | --- | --- |
| `map`       | `ghost-map` | Author the topology card | "map this repo", "write map.md" |
| `profile`   | `ghost-expression` | Author the quality bar | "profile this design language", "write expression.md" |
| `review`    | `ghost-drift` | Self-govern at PR time | "review this PR for drift" |
| `verify`    | `ghost-drift` | Self-govern at generation time | "verify generated UI against the expression" |
| `compare`   | `ghost-drift` | Detect drift across the org | "why did these two expressions drift?" |
| `remediate` | `ghost-drift` | Suggest minimal fixes for drift | "fix this drift" |
| `target`    | `ghost-fleet` | Synthesize fleet narrative | "describe this fleet" |

These are instructions, not code. The agent executes them using its normal tools (file search, reading, editing) plus the relevant Ghost CLI for any deterministic step. (`discover` and `generate` are intentionally not migrated — see [`docs/ideas/phase-0-decisions.md`](./docs/ideas/phase-0-decisions.md).)

## Configuration

`ghost.config.ts` is optional — only `ghost-drift ack` and `ghost-drift diverge` consult it (to locate the tracked expression). Everything else is zero-config.

### Environment variables

- `OPENAI_API_KEY` / `VOYAGE_API_KEY`: optional, consumed by `computeSemanticEmbedding` (a `@ghost/core` library function) when a host writes an `expression.md` and wants the enriched 49-dim vector.
- `GITHUB_TOKEN`: optional, used by `resolveTrackedExpression` when fetching a tracked expression from GitHub (avoids rate limits).

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## How It Works

### The expression

What the agent reads when it authors, reviews, or remediates. The canonical artifact is **`expression.md`** (owned by `ghost-expression`): a Markdown document with YAML frontmatter (machine layer) plus a three-layer prose body. Human-readable, LLM-consumable, diff-friendly:

- **Frontmatter**: 49-dimensional embedding, palette, spacing, typography, surfaces, roles, provenance. What deterministic tools read.
- **`# Character`**: the opening atmosphere read, evocative not technical. What an agent quotes to stay on-brand.
- **`# Signature`**: 3–7 distinctive traits that make _this_ system unlike its peers. The drift-sensitive moves.
- **`# Decisions`**: abstract, implementation-agnostic choices with evidence. Each decision is embedded so `ghost-drift compare --semantic` can match semantically.

Generate one with the `profile` recipe (in the `ghost-expression` skill bundle). See [`docs/expression-format.md`](./docs/expression-format.md) for the full spec, including the 49-dim machine-vector breakdown.

### The map

What every Ghost tool reads to learn the topology of a repo. The canonical artifact is **`map.md`** (owned by `ghost-map`): YAML frontmatter against the `ghost.map/v1` schema (languages, build system, package manifests, registry, design-system paths, UI surface globs, feature areas) plus a short prose body (Identity, Topology, Conventions). The repo's own `map.md` lives at the root.

Generate one with the `map` recipe (in the `ghost-map` skill bundle). The agent reads `ghost-map inventory` (deterministic raw signals) and synthesizes the prose layer.

### Author + self-govern loop

The literal loop the pitch describes: the agent authors UI, Ghost detects drift against the expression, a human (or the agent itself) picks the remediation. The expression grounds the generator; the `review` recipe surfaces drift in the output so a decision (*acknowledge, track, or diverge*) can be made at the right time. The `verify` recipe drives the loop across a prompt suite and classifies each dimension as _tight_, _leaky_, or _uncaptured_: the mechanism that tells the expression where it needs to say more. See [`docs/generation-loop.md`](./docs/generation-loop.md) for details.

### Remediation

Three responses, each with recorded reasoning and full lineage, so a year from now you know whether a divergence was meant or missed:

- **`expression.md`**: The canonical expression artifact.
- **`.ghost-sync.json`**: Per-dimension stances toward the tracked expression (aligned, accepted, or diverging), each with recorded reasoning. Written by `ghost-drift ack` / `track` / `diverge`.
- **`.ghost/history.jsonl`**: Append-only expression history for temporal analysis. Read by `ghost-drift compare --temporal`.

### Org-scale observability

Drift at scale: the fleet view. Two routes, depending on what you have:

- **Many expressions, no map**: run `ghost-drift compare` with three or more `expression.md` files. Returns the **composite expression** — pairwise distances, a centroid, similarity clusters. An expression of expressions.
- **A registered fleet** (members each with `map.md` + `expression.md`): run `ghost-fleet view`. Adds group-by axes (platform, build system, design-system status) on top of the composite. The map metadata is the orthogonal axis pure expression-comparison can't see.

## Project Resources

| Resource                             | Description                 |
| ------------------------------------ | --------------------------- |
| [INVARIANTS.md](./INVARIANTS.md)     | Hard constraints — read before non-trivial changes |
| [CODEOWNERS](./CODEOWNERS)           | Project lead(s)             |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute           |
| [GOVERNANCE.md](./GOVERNANCE.md)     | Project governance          |
| [LICENSE](./LICENSE)                 | Apache License, Version 2.0 |
