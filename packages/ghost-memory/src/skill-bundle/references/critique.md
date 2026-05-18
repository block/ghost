---
name: critique
description: Critique generated or changed work using Ghost memory and ghost-drift.
---

# Critique With Ghost Memory

Use this after generated or changed UI exists. `ghost-drift` remains the judge;
Ghost Memory adds role-aware interpretation.

## Steps

1. Run `ghost-drift check` for deterministic gates when a diff is available.
2. Run `ghost-drift review --include-memory` for advisory critique.
3. Read the review packet and accepted decisions.
4. Separate findings by role:
   - design: feel, hierarchy, flow, density, tone
   - engineering: implementation choices that preserve experience
   - pm: product promise and tradeoffs
   - qa: experience invariants and edge states
5. Classify each issue as fix, intentional divergence, or missing memory.

## Output

Lead with actionable findings. Cite diff locations, patterns, survey evidence,
intent, accepted decisions, and repairs where relevant.

Never fail a build on advisory-only memory. Only active `checks.yml` gates block.
