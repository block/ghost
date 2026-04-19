---
name: ghost-fingerprint
description: Profile any design system (local path, GitHub repo, npm package, URL) to generate a structured fingerprint of its visual language — colors, spacing, typography, surfaces, and architecture. Use when the user asks about a project's design system, visual language, design tokens, or styling approach.
license: MIT
---

# Ghost Fingerprint

Generate a structured design fingerprint for any project or design system.

## When to use

- User asks "what design system does this use?" or "what's the visual language?"
- User wants to understand the colors, typography, spacing, or styling approach of a project
- User wants a structured analysis of design tokens or theming
- User asks about component architecture or CSS methodology

## Commands

```bash
# Profile the current directory
ghost profile .

# Profile a GitHub repo
ghost profile github:shadcn-ui/ui

# Profile an npm package
ghost profile npm:@chakra-ui/react

# Profile with AI enrichment (richer interpretation)
ghost profile github:shadcn-ui/ui --ai --verbose

# Save fingerprint to a file
ghost profile . --output my-system.json

# Profile with JSON output (machine-readable)
ghost profile . --format json

# Publish .ghost-fingerprint.json artifact
ghost profile . --emit

# Profile a shadcn registry directly
ghost profile --registry https://ui.shadcn.com/registry.json

# Extract specific dimensions from JSON output
ghost profile . --format json | jq '.palette'
ghost profile . --format json | jq '.typography'
ghost profile . --format json | jq '.architecture'
```

## Prerequisites

- `ghost` CLI built: `pnpm install && pnpm build` (or `npm install -g ghost-cli`)
- One of: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` environment variable set (required for `--ai` flag)

## Understanding the output

The fingerprint contains 5 dimensions:

1. **Palette**: Dominant colors, semantic colors (primary, accent, etc.), saturation profile, contrast level
2. **Spacing**: Scale values, regularity score, base unit
3. **Typography**: Font families, size ramp, weight distribution, line height pattern
4. **Surfaces**: Border radii, shadow complexity, border usage
5. **Architecture**: Tokenization score (0-1), CSS methodology, component count, naming pattern

A **49-dimensional embedding** vector enables quantitative comparison between systems.
