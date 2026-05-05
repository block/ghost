---
name: ghost-drift
description: Compare expressions and review UI drift. Use when the user wants to compare two expressions, review frontend code changes against an expression.md, verify generated UI, suggest fixes, or record stance toward a tracked expression (acknowledge, track, diverge). Triggers on phrases like "check for drift", "compare these expressions", "review this PR for design issues", "verify this generated UI", or "we accept this divergence".
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-drift
---

# Ghost Drift — Drift Review

This skill compares UI changes against the project's `expression.md`. It helps catch palette, spacing, type, surface, and decision drift.

You do the reading and judgment. The `ghost-drift` CLI gives deterministic results: expression distance, temporal aggregates, and stance-file writes.

Authoring an `expression.md` lives in the sibling `ghost-expression` skill. Drift compares them under change.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost-drift compare <a.md> <b.md> [...more]` | Pairwise distance + per-dimension delta (N=2) or composite (N≥3: pairwise matrix, centroid, spread, clusters). Vector math over embeddings derived from the authored expressions. `--semantic` and `--temporal` flags add qualitative enrichment for N=2. |
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

- **YAML frontmatter:** `id`, `source`, `timestamp`, `references`, `observation.personality`, `observation.resembles`, `decisions[].dimension`, `checks[]`, `palette`, `spacing`, `typography`, `surfaces`.
- **Markdown body:** `# Character`, `# Signature`, `# Decisions` with `### <dimension>` rationale blocks ending in `**Evidence:**` bullets.

There are no sibling fragments. Do not look for `embedding.md`, `# Fragments`, or implicit `decisions/*.md`; comparison computes embeddings from `expression.md` at runtime.

Validate via `ghost-expression lint` before drawing conclusions from a drift comparison.

## Always

- Reads of `expression.md` are read-only. Drift never rewrites it. To update an expression, run the profile recipe in `ghost-expression`.
- A non-zero distance is information, not a verdict. The threshold belongs to the consumer (CI gate, PR review, human judgment).
- When the user accepts a drift, record it: `ghost-drift ack` / `track` / `diverge`.

## Never

- Don't go looking for CLI verbs for `review`, `verify`, or `remediate`. Those are recipes you execute, not commands to invoke.
- Never auto-update an expression because drift exists. Surface the drift and wait for instruction.
- Don't expect the CLI to make the judgment call. Vector distance is math; whether the drift is intentional, acceptable, or a regression is for you to decide via the relevant recipe.
