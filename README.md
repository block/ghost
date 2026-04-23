# Ghost

**Brand fidelity infrastructure for an agent-authored world. Every generation gets a fingerprint the harness can read, enforce, and check.**

AI is becoming the primary author of shipped code. Humans sit in fewer diffs; the harness (guardrails, reviewers, verifiers) catches drift before it lands. In that world, ensuring every generation reflects a brand's voice is paramount. Fonts and spacing are the easy half. The hard half is character: the posture a product takes, what it refuses to do. That's where generations drift first.

Ghost closes that loop. It captures a brand as a **fingerprint**: a human-readable `fingerprint.md` encoding character, signature traits, and concrete decisions. It gives any agent the primitives to author against it, detect drift the moment it happens, and record the right stance: **acknowledge**, **adopt**, or **intentionally diverge**. Power moves to the consumer: each team owns its fork, its trajectory, and its stance. The org's fingerprint drifts in the open. Nothing gets enforced; nothing drifts silently. Deterministic arithmetic lives in Ghost's CLI; judgment lives in whatever agent you already use.

## BYOA: bring your own agent

Ghost splits the work the way agents need it split: **judgement in the agent, arithmetic in the CLI**.

- **The CLI**: a set of **deterministic primitives**. Six verbs. It never calls an LLM. It does vector distance, schema validation, and manifest writes. Same answer every time.
- **A skill bundle**: [agentskills.io](https://agentskills.io)-compatible recipes for the interpretive work (profile, review, verify, generate, discover). The host agent (Claude Code, Codex, Cursor, Goose, …) runs the recipes and calls the CLI for the arithmetic.

No API key is required to use any CLI verb. Judgment work lives in whichever agent you already use; `ghost-drift emit skill` installs the recipes there.

## Why Ghost?

Ghost gives agents four capabilities the design-at-scale problem actually needs:

- **Author against a real quality bar**: `ghost-drift emit context-bundle` and the `generate` recipe turn a design language into grounding an agent can actually follow. The fingerprint is the bar; the agent authors to it.
- **Self-govern at author time**: the `review` and `verify` recipes run an agent's output against the fingerprint *before* a human sees it. Drift gets caught where it's cheap to fix, not after it ships.
- **Detect drift at the right time**: PR-time (via `review`), generation-time (via `verify`), or org-time (via `compare` on N≥3 consumers — the composite view). Timing is load-bearing: the same drift surfaced a month later is noise; surfaced inline, it's action.
- **Remediate with structured intent**: `ack`, `adopt`, `diverge` are the three moves. Every stance is published with reasoning and full lineage. Drift without intent is noise; drift with intent is signal the parent can heal from.
- **Human-readable, diff-friendly**: `fingerprint.md` is Markdown with YAML frontmatter (machine layer) plus a three-layer prose body (Character, Signature, Decisions). Humans read it, agents consume it, deterministic tools diff it. No DSL to learn.

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 10+

### Install

```bash
pnpm install
pnpm build
```

### Install the skill into your host agent

```bash
# Writes the ghost-drift skill bundle to ./.claude/skills/ghost-drift
ghost-drift emit skill
```

Once the skill is installed, ask your agent to "profile this design language" or "review this PR for design drift" and it will follow the recipe, calling `ghost-drift` for any deterministic step.

### Quick start

**1. Profile your system**: ask your host agent (Claude Code, Cursor, etc.) to write a `fingerprint.md`. It'll follow the `profile` recipe and validate with `ghost-drift lint` at the end.

**2. Validate the result:**

```bash
ghost-drift lint                                   # defaults to ./fingerprint.md
ghost-drift lint path/to/fingerprint.md --format json
```

**3. Compare fingerprints:**

```bash
# Pairwise: per-dimension distance
ghost-drift compare parent.fingerprint.md consumer.fingerprint.md

# Add qualitative interpretation of decisions + palette
ghost-drift compare a.md b.md --semantic

# Add velocity / trajectory (reads .ghost/history.jsonl)
ghost-drift compare before.md after.md --temporal

# Composite (N≥3): pairwise matrix, centroid, clusters — the org fingerprint
ghost-drift compare *.fingerprint.md
```

**4. Track intent toward a parent:**

```bash
ghost-drift ack --stance aligned --reason "Initial baseline"
ghost-drift adopt new-parent.fingerprint.md
ghost-drift diverge typography --reason "Editorial product uses a different type scale"
```

**5. Emit derived artifacts:**

```bash
ghost-drift emit review-command     # .claude/commands/design-review.md (per-project slash command)
ghost-drift emit context-bundle     # ghost-context/ (SKILL.md + tokens.css + prompt.md)
ghost-drift emit skill              # .claude/skills/ghost-drift (the agentskills.io skill bundle)
```

**Run the docs site locally:**

```bash
just dev
# or: pnpm -F ghost-docs dev
```

## CLI Commands

Six deterministic primitives, grouped by the loop: **author** (`emit`), **detect** (`compare`, `lint`), **remediate** (`ack`, `adopt`, `diverge`). Everything interpretive is a skill recipe the host agent runs.

| Command          | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `ghost-drift compare`  | Pairwise distance (N=2) or composite fingerprint (N≥3: pairwise matrix, centroid, clusters) over embeddings. `--semantic` and `--temporal` add qualitative enrichment for N=2. |
| `ghost-drift lint`     | Validate `fingerprint.md` schema + body/frontmatter coherence. Use before declaring a fingerprint valid. |
| `ghost-drift ack`      | Record a stance toward the parent (aligned / accepted / diverging) in `.ghost-sync.json`. |
| `ghost-drift adopt`    | Shift parent baseline to a new fingerprint.                                        |
| `ghost-drift diverge`  | Declare intentional divergence on a dimension with reasoning.                      |
| `ghost-drift emit`     | Derive an artifact from `fingerprint.md`: `review-command`, `context-bundle`, or `skill`. |

### Skill recipes: run by the host agent

Install once with `ghost-drift emit skill`. Each recipe gives the agent a specific capability from the pitch (*author, self-govern, detect, remediate*):

| Recipe     | Capability                         | Triggered by                                   |
| ---------- | ---------------------------------- | ---------------------------------------------- |
| `profile`  | Author the quality bar             | "profile this", "write a fingerprint.md"        |
| `generate` | Author *against* the quality bar   | "generate a component matching our design"      |
| `review`   | Self-govern at PR time             | "review this PR for drift"                      |
| `verify`   | Self-govern at generation time     | "verify generated UI against the fingerprint"   |
| `compare`  | Detect drift across the org        | "why did these two fingerprints drift?"         |
| `discover` | Find quality bars worth borrowing  | "find design languages like X"                  |

These are instructions, not code. The agent executes them using its normal tools (file search, reading, editing) plus `ghost-drift` for the deterministic steps.

## Configuration

`ghost.config.ts` is optional — only `ack` and `diverge` consult it (to locate the parent fingerprint). Everything else is zero-config.

### Environment variables

- `OPENAI_API_KEY` / `VOYAGE_API_KEY`: optional, consumed by `computeSemanticEmbedding` when a host writes a fingerprint.md and wants the enriched 49-dim vector.
- `GITHUB_TOKEN`: optional, used by `resolveParent` when fetching a parent fingerprint from GitHub (avoids rate limits).

The CLI auto-loads `.env` and `.env.local` from the working directory.

## How It Works

### The fingerprint

What the agent reads when it authors, reviews, or remediates. The canonical artifact is **`fingerprint.md`**: a Markdown document with YAML frontmatter (machine layer) plus a three-layer prose body. Human-readable, LLM-consumable, diff-friendly:

- **Frontmatter**: 49-dimensional embedding, palette, spacing, typography, surfaces, roles, provenance. What deterministic tools read.
- **`# Character`**: the opening atmosphere read, evocative not technical. What an agent quotes to stay on-brand.
- **`# Signature`**: 3–7 distinctive traits that make _this_ system unlike its peers. The drift-sensitive moves.
- **`# Decisions`**: abstract, implementation-agnostic choices with evidence. Each decision is embedded so `compare --semantic` can match semantically.

Generate one with the `profile` recipe. See [`docs/fingerprint-format.md`](./docs/fingerprint-format.md) for the full spec, including the 49-dim machine-vector breakdown.

### Author + self-govern loop

The literal loop the pitch describes: the agent authors UI, Ghost detects drift against the fingerprint, a human (or the agent itself) picks the remediation. The fingerprint grounds the generator; the `review` recipe surfaces drift in the output so a decision (*acknowledge, adopt, or diverge*) can be made at the right time. The `verify` recipe drives the loop across a prompt suite and classifies each dimension as _tight_, _leaky_, or _uncaptured_: the mechanism that tells the fingerprint where it needs to say more. See [`docs/generation-loop.md`](./docs/generation-loop.md) for details.

### Remediation

Three responses, each with recorded reasoning and full lineage, so a year from now you know whether a divergence was meant or missed:

- **`fingerprint.md`**: The canonical fingerprint artifact.
- **`.ghost-sync.json`**: Per-dimension stances toward the parent (aligned, accepted, or diverging), each with recorded reasoning. Written by `ack` / `adopt` / `diverge`.
- **`.ghost/history.jsonl`**: Append-only fingerprint history for temporal analysis. Read by `compare --temporal`.

### Org-scale observability

Drift at scale: the signal the parent design language heals from. Run `ghost-drift compare` with three or more fingerprints and Ghost returns the **composite fingerprint** — pairwise distances, a centroid, and similarity clusters. Which consumers are coherent, which are drifting, and where the gaps are. A fingerprint of fingerprints.

## Project Resources

| Resource                             | Description                 |
| ------------------------------------ | --------------------------- |
| [CODEOWNERS](./CODEOWNERS)           | Project lead(s)             |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute           |
| [GOVERNANCE.md](./GOVERNANCE.md)     | Project governance          |
| [LICENSE](./LICENSE)                 | Apache License, Version 2.0 |
