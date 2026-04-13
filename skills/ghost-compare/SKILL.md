---
name: ghost-compare
description: Compare two design systems side-by-side to understand their differences across colors, spacing, typography, surfaces, and architecture. Use when the user asks how two design systems differ, wants to evaluate alternatives, or needs to understand design system relationships.
license: MIT
---

# Ghost Compare

Compare two design systems and understand their differences.

## When to use

- User asks "how does X differ from Y?" about design systems
- Evaluating which design system to adopt
- Understanding the relationship between a fork and its parent
- Comparing multiple design systems in a fleet

## Commands

```bash
# Compare two systems
ghost compare github:shadcn-ui/ui npm:@chakra-ui/react

# Compare local project against a known system
ghost compare . github:shadcn-ui/ui

# JSON output for programmatic use
ghost compare github:shadcn-ui/ui npm:@radix-ui/themes --format json

# Fleet comparison (3+ systems at once)
ghost fleet github:shadcn-ui/ui npm:@chakra-ui/react npm:@mantine/core

# Fleet with clustering analysis
ghost fleet github:shadcn-ui/ui npm:@chakra-ui/react npm:@mantine/core --cluster
```

## Understanding comparison output

The comparison shows:
- **Overall distance** (0-1): 0 = identical, 1 = completely different
- **Per-dimension distances**: Which aspects differ most (palette, spacing, typography, surfaces, architecture)
- **Classification**: intentional-variant, accidental-drift, evolution-lag, or incompatible
- **Explanations**: Human-readable description of each dimension's divergence

## Prerequisites

- `ghost` CLI installed: `npm install -g @ghost/cli` or use `npx ghost`
- One of: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` environment variable set
