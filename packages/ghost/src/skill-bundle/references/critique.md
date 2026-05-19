---
name: critique
description: Critique generated or changed work using the Ghost fingerprint and CLI.
---

# Critique With The Ghost Fingerprint

Use this after generated or changed UI exists. `ghost` emits deterministic
checks and advisory packets; the fingerprint supplies role-aware interpretation.

## Steps

1. Run `ghost check` for deterministic gates when a diff is available.
2. Run `ghost review --include-memory` for advisory critique.
3. Read the review packet and accepted decisions.
4. Separate findings by role:
   - design: feel, hierarchy, flow, density, tone
   - engineering: implementation choices that preserve experience
   - pm: product promise and tradeoffs
   - qa: experience commitments and edge states
5. Classify each issue as fix, intentional divergence, or missing fingerprint context.

## Output

Lead with actionable findings. Cite diff locations, patterns, survey evidence,
intent, accepted decisions, and repairs where relevant.

Never fail a build on advisory-only context. Only active `checks.yml` gates block.
