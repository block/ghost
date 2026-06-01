---
name: critique
description: Critique generated or changed work using .ghost/fingerprint.yml and the Ghost CLI.
---

# Critique With The Ghost Fingerprint

Use this after generated or changed UI exists. `ghost` emits deterministic
checks and advisory packets; `fingerprint.yml` supplies product-experience
memory.

## Steps

1. Run `ghost check` for deterministic gates when a diff is available.
2. Run `ghost review --include-memory` for advisory critique.
3. Read the review packet, accepted decisions, and open proposals.
4. Separate findings by role:
   - design: hierarchy, flow, density, tone, accessibility
   - engineering: implementation choices that preserve experience
   - pm: product promise, tradeoffs, trust, disclosure
   - qa: experience commitments and edge states
5. Classify each issue as `fix`, `intentional-divergence`,
   `missing-memory`, `experience-gap`, or `eval-uncertainty`.

## Output

Lead with actionable findings. Cite diff locations, fingerprint memory, active
checks, open proposals, accepted decisions, and repairs where relevant.

Never fail a build on advisory-only context. Only active `checks.yml` gates
block.
