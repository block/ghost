---
name: ghost-drift
description: Detect and govern visual-language drift in design systems. Use when the user wants to compare two expressions, review frontend code changes for drift against an expression.md, verify generated UI against an expression, suggest minimal fixes that close a drift gap, or record stance toward a tracked expression (acknowledge, track, diverge). Triggers on phrases like "check for drift", "compare these expressions", "review this PR for design issues", "verify this generated UI", or "we accept this divergence".
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-drift
---

# Ghost Drift — Design Drift Detection

Ghost captures a project's visual language as an `expression.md`. **Drift** is what happens between expressions: pairwise comparison, composite analysis across many, the temporal trajectory of one over time, and the governance signals (`ack`, `track`, `diverge`) that record stance toward change.

Authoring an `expression.md` lives in the sibling `ghost-expression` skill. Drift compares them under change.

Ghost's CLI is a set of **deterministic primitives**. It never calls an LLM. Synthesis, interpretation, and generation happen in **you, the host agent**; the CLI hands you the arithmetic (vector distance, temporal aggregates, manifest writes) you call on when you need a stable answer.

## CLI primitives

| Verb | Purpose |
|---|---|
| `ghost-drift compare <a.md> <b.md> [...more]` | Pairwise distance + per-dimension delta (N=2) or composite (N≥3: pairwise matrix, centroid, spread, clusters). Pure math over expression embeddings. `--semantic` and `--temporal` flags add qualitative enrichment for N=2. |
| `ghost-drift ack` / `ghost-drift track <expression.md>` / `ghost-drift diverge <dim>` | Record stance toward the tracked expression (aligned / accepted / diverging) in `.ghost-sync.json`. Reads the local `expression.md`. |
| `ghost-drift emit skill` | Install this agent skill bundle into your host agent. |

Five verbs. Authoring (lint/describe/diff/emit-review-command/emit-context-bundle) lives in `ghost-expression`. If you find yourself reaching for `ghost-drift review` or `ghost-drift verify` — those are *your* workflows, not CLI commands. Follow the recipes below.

## Workflows (your job, not the CLI's)

When the user asks you to:

- "Compare these two expressions" → run `ghost-drift compare <a> <b>`; if they ask *why* they drifted, add `--semantic`. See [references/compare.md](references/compare.md) for interpretation.
- "Review this PR/these changes for drift" → [references/review.md](references/review.md)
- "Verify this generated UI matches the expression" → [references/verify.md](references/verify.md)
- "Suggest fixes for this drift" / "remediate this" → [references/remediate.md](references/remediate.md)

For authoring or describing an expression itself (write expression.md, lint, describe, diff, emit review-command/context-bundle), install the `ghost-expression` skill.

## The expression.md format (recap)

An `expression.md` has:

- **YAML frontmatter (machine layer):** `id`, `source`, `timestamp`, `observation.personality`, `observation.resembles`, `decisions[].dimension`/`.evidence`, `palette`, `spacing`, `typography`, `surfaces`, `roles`.
- **Markdown body (prose layer):** `# Character` (`observation.summary`), `# Signature` (bullets from `distinctiveTraits`), `# Decisions` with `### <dimension>` rationale blocks.

Validate via `ghost-expression lint` before drawing conclusions from a drift comparison.

## Always

- Reads of `expression.md` are read-only — drift never rewrites the canonical artifact. To update an expression, run the profile recipe (in `ghost-expression`).
- A non-zero distance is information, not a verdict. The threshold belongs to the consumer (CI gate, PR review, human judgement).
- When the user accepts a drift, record it: `ghost-drift ack` / `track` / `diverge`. An undeclared drift is governance noise.

## Never

- Never wrap a workflow recipe in a CLI verb. `review`, `verify`, `remediate` are recipes you execute, not commands to invoke.
- Never auto-update an expression because drift exists. Expressions evolve by deliberate act (Invariant 5) — your role is to surface the drift and wait for instruction.
- Never call an LLM from a verb. If you need judgement (e.g., "is this drift intentional"), apply the relevant recipe; the CLI itself does math, not interpretation.
