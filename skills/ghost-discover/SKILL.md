---
name: ghost-discover
description: Find public design systems similar to a query or project. Searches a curated catalog, npm registry, and GitHub. Use when the user wants to find design systems, explore alternatives, or discover component libraries.
license: MIT
---

# Ghost Discover

Find public design systems matching a query or similar to your project.

## When to use

- User asks "what design systems are similar to X?"
- User wants to find component libraries for a specific framework
- Exploring the design system ecosystem
- Looking for open-source alternatives to a proprietary system

## Commands

```bash
# Search by keyword
ghost discover "tailwind components"

# Search for React-specific systems
ghost discover "react design system"

# JSON output
ghost discover "vue components" --format json
```

## Data sources

Ghost searches three sources progressively:
1. **Curated catalog**: 17 well-known systems (shadcn, Material UI, Chakra, etc.)
2. **npm registry**: Package search filtered for design system keywords
3. **GitHub**: Repository search sorted by stars (requires `GITHUB_TOKEN` for higher rate limits)

## Prerequisites

- `ghost` CLI built: `pnpm install && pnpm build` (or `npm install -g ghost-cli`)
- Optional: `GITHUB_TOKEN` for GitHub search (avoids rate limits)
- Optional: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for LLM-powered discovery
