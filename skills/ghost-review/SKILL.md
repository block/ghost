---
name: ghost-review
description: Review code for visual language drift against a design expression. Detects hardcoded colors, off-scale spacing, mismatched typography, and inconsistent surfaces — then suggests the correct value from the design system. Use when reviewing PRs, checking design consistency, or when the user asks "does this match our design system?"
license: Apache-2.0
---

# Ghost Design Review

Review code for visual language drift against a design system expression.

## When to use

- Reviewing a PR that modifies UI components or styles
- User asks "does this match our design system?" or "check for design drift"
- User wants to verify code uses the right colors, spacing, typography, or radii
- User wants to catch hardcoded values that should use design tokens
- Before merging UI changes — run as a pre-merge check

## How it works

Ghost uses a **design expression** (`expression.md`) as the source of truth for the visual language. It scans changed files and flags any hardcoded value that doesn't match the expression's palette, spacing scale, type ramp, or surface radii.

The expression IS the rule set — different project, different expression, different rules.

## Prerequisites

- Ghost CLI built: `pnpm install && pnpm build` in the ghost repo
- An expression file: run `ghost profile . --emit` to generate `expression.md`
- Commit the expression to the repo so `ghost review` can find it

## Commands

```bash
# Review uncommitted changes (default — zero config)
ghost review

# Review specific files
ghost review src/components/Button.tsx

# Review staged changes only
ghost review --staged

# Review changes vs main branch
ghost review --diff --base main

# Enable LLM-powered deep review (requires ANTHROPIC_API_KEY)
ghost review --deep

# Check only specific dimensions
ghost review --dimensions palette,spacing

# Report all issues, not just on changed lines
ghost review --all

# JSON output (for CI/scripts)
ghost review --format json

# GitHub PR comment format
ghost review --format github
```

## What it checks

Ghost reviews across four expression dimensions:

### Palette
Detects hardcoded color values not in the design palette. Supports hex, rgb, hsl, oklch in CSS, JSX style props, and Tailwind arbitrary values (`bg-[#xxx]`).

### Spacing
Detects spacing values (padding, margin, gap) not in the spacing scale. Supports CSS properties, JSX style props, and Tailwind arbitrary values (`p-[12px]`).

### Typography
Detects font sizes not in the type ramp. Supports CSS `font-size`, JSX `fontSize`, and Tailwind `text-[15px]`.

### Surfaces
Detects border radii not in the design surfaces. Supports CSS `border-radius`, JSX `borderRadius`, and Tailwind `rounded-[6px]`.

## Output

Each issue includes:
- The file and line number
- What value was found vs. the nearest correct value
- The semantic role of the nearest value (e.g., "primary", "surface")
- A concrete fix suggestion

## Deep review (--deep)

With `--deep` and `ANTHROPIC_API_KEY`, Ghost sends flagged files to Claude for nuanced analysis:
- Color role misuse (using primary where destructive is appropriate)
- Spacing density inconsistency
- Typography hierarchy violations
- Surface hierarchy issues

## Configuration (optional)

In `ghost.config.ts`:

```typescript
export default defineConfig({
  review: {
    deep: false,
    dimensions: { palette: true, spacing: true, typography: true, surfaces: true },
    changedLinesOnly: true,
    tolerance: {
      colorDistance: 0.05,  // OKLCH distance threshold
      spacingDelta: 1,     // px tolerance
    },
    exclude: ["**/*.test.*", "**/stories/**"],
  },
});
```

## Workflow

1. Profile your project: `ghost profile . --emit`
2. Commit `expression.md`
3. Run `ghost review` on every PR (or use the GitHub Action)
