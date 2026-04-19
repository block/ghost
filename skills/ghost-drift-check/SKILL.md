---
name: ghost-drift-check
description: Check if a project's design implementation drifts from its parent design system. Use when reviewing PRs that touch design tokens, theme files, or styling — or when the user asks about design compliance, drift, or consistency.
license: MIT
---

# Ghost Drift Check

Detect design drift between a project and its parent design system.

## When to use

- Reviewing a PR that modifies design tokens, theme files, or CSS variables
- User asks "is this consistent with our design system?"
- User wants to check compliance against design standards
- CI/CD integration for design drift detection

## Commands

```bash
# First, profile the parent to get a fingerprint file
ghost profile github:shadcn-ui/ui --output parent.json

# Check compliance against the parent fingerprint
ghost review project . --against parent.json

# Check compliance with custom thresholds
ghost review project . --against parent.json --max-drift 0.3

# Output as JSON for CI integration
ghost review project . --against parent.json --format json

# Output as SARIF for GitHub Code Scanning
ghost review project . --against parent.json --format sarif

# Check a remote target against a parent
ghost review project github:my-org/my-app --against parent.json
```

## Understanding drift classifications

- **aligned** (distance < 0.1): Minor customization within bounds
- **minor-drift** (0.1 - 0.3): Some unintentional differences
- **significant-drift** (0.3 - 0.6): Parent has moved or consumer diverged
- **major-divergence** (> 0.6): Fundamentally different design languages

## Acknowledging drift

When drift is intentional, acknowledge it to suppress future warnings:

```bash
ghost ack --dimension palette --reason "Brand refresh: new primary color"
ghost diverge spacing --reason "Compact density variant"
```

## Prerequisites

- `ghost` CLI built: `pnpm install && pnpm build` (or `npm install -g ghost-cli`)
- One of: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` environment variable set
