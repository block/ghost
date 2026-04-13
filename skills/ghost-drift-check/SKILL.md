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
# Check compliance against a parent system
ghost comply . --against github:shadcn-ui/ui

# Check compliance with custom thresholds
ghost comply . --against github:shadcn-ui/ui --max-drift 0.3

# Compare current state to a saved fingerprint
ghost drift . --parent fingerprint.json

# Output as JSON for CI integration
ghost comply . --against github:shadcn-ui/ui --format json

# Output as SARIF for GitHub Code Scanning
ghost comply . --against github:shadcn-ui/ui --format sarif
```

## Understanding drift classifications

- **aligned** (distance < 0.1): Minor customization within bounds
- **minor-drift** (0.1 - 0.3): Some unintentional differences
- **significant-drift** (0.3 - 0.6): Parent has moved or consumer diverged
- **major-divergence** (> 0.6): Fundamentally different design languages

## Acknowledging drift

When drift is intentional, acknowledge it to suppress future warnings:

```bash
ghost ack palette --reason "Brand refresh: new primary color"
ghost ack spacing --reason "Compact density variant"
```

## Prerequisites

- `ghost` CLI installed: `npm install -g @ghost/cli` or use `npx ghost`
- One of: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` environment variable set
