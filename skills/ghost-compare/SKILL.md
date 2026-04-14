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
# Profile two systems first, then compare the fingerprint files
ghost profile github:shadcn-ui/ui --output shadcn.json
ghost profile npm:@chakra-ui/react --output chakra.json
ghost compare shadcn.json chakra.json

# Compare local project against a known system
ghost profile . --output local.json
ghost profile github:shadcn-ui/ui --output shadcn.json
ghost compare local.json shadcn.json

# JSON output for programmatic use
ghost compare shadcn.json chakra.json --format json

# Include temporal analysis (velocity, trajectory)
ghost compare shadcn.json chakra.json --temporal

# Fleet comparison (3+ fingerprint files at once)
ghost fleet shadcn.json chakra.json mantine.json

# Fleet with clustering analysis
ghost fleet shadcn.json chakra.json mantine.json --cluster
```

## Understanding comparison output

The comparison shows:
- **Overall distance** (0-1): 0 = identical, 1 = completely different
- **Per-dimension distances**: Which aspects differ most (palette, spacing, typography, surfaces, architecture)
- **Classification**: intentional-variant, accidental-drift, evolution-lag, or incompatible
- **Explanations**: Human-readable description of each dimension's divergence

## Prerequisites

- `ghost` CLI built: `pnpm install && pnpm build` (or `npm install -g ghost-cli`)
- One of: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` environment variable set
