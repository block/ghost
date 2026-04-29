---
name: ghost-drift
description: Detect and govern visual-language drift in design systems. Use when the user wants to compare two expressions, review frontend code changes for drift against an expression.md, verify generated UI against an expression, suggest minimal fixes that close a drift gap, or record stance toward a tracked expression (acknowledge, track, diverge). Triggers on phrases like "check for drift", "compare these expressions", "review this PR for design issues", "verify this generated UI", or "we accept this divergence".
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-drift
---

# Ghost Drift — Design Drift Detection

When you generate UI in this project, it drifts. Palette goes off, spacing creeps, hierarchy slips. This skill helps you catch and resolve that drift against the project's `expression.md` — the canonical answer to "what does the design language look like here."

You do the reading, deciding, and writing. The `ghost-drift` CLI is the calculator you reach for when you need a reproducible answer: vector distance between expressions, temporal aggregates, governance manifest writes. Call it freely; the output is ground truth.

Authoring an `expression.md` lives in the sibling `ghost-expression` skill. Drift compares them under change.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost-drift compare <a.md> <b.md> [...more]` | Pairwise distance + per-dimension delta (N=2) or composite (N≥3: pairwise matrix, centroid, spread, clusters). Vector math over expression embeddings. `--semantic` and `--temporal` flags add qualitative enrichment for N=2. |
| `ghost-drift ack` / `ghost-drift track <expression.md>` / `ghost-drift diverge <dim>` | Record stance toward the tracked expression (aligned / accepted / diverging) in `.ghost-sync.json`. Reads the local `expression.md`. |
| `ghost-drift emit skill` | Install this agent skill bundle into your host agent. |

Five verbs. Authoring (lint/describe/diff/emit-review-command/emit-context-bundle) lives in `ghost-expression`. If you find yourself reaching for `ghost-drift review` or `ghost-drift verify` — those are *your* workflows. Follow the recipes below.

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

- Don't go looking for CLI verbs for `review`, `verify`, or `remediate`. Those are recipes you execute, not commands to invoke.
- Never auto-update an expression because drift exists. Expressions evolve by deliberate act (Invariant 5) — your role is to surface the drift and wait for instruction.
- Don't expect the CLI to make the judgement call. Vector distance is math; whether the drift is intentional, acceptable, or a regression is for you to decide via the relevant recipe.
