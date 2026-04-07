# Ghost

**Design drift detection, fingerprinting, and design language tooling for design systems.**

Ghost is a monorepo for understanding and managing design systems at scale. It detects unintentional divergence between a parent design language and its consumer implementations, generates design fingerprints for quantitative comparison, tracks how systems evolve over time, and ships a reference design language as a shadcn-compatible component registry.

## Why Ghost?

Design languages drift. Teams override tokens, hardcode colors, restructure components, and make visual changes that silently diverge from the source of truth. Drift can be neutral. Sometimes organic. Sometimes a mistake. Sometimes intentional. Ghost catches this drift.

- **Multi-dimensional scanning** - Detect token overrides, hardcoded values, structural divergence, and pixel-level visual regressions
- **Design fingerprinting** - Generate a 64-dimensional numeric profile of any design system for quantitative comparison
- **Evolution tracking** - Acknowledge, adopt, or intentionally diverge from a parent system with full lineage history
- **Fleet analysis** - Compare fingerprints across an ecosystem to identify clusters and outliers
- **LLM-powered interpretation** - Optionally use Claude or OpenAI for richer fingerprint generation
- **3D visualization** - Explore fingerprint similarity space in an interactive Three.js viewer
- **Reference design language** - A full shadcn-compatible registry with 97 components, design tokens, and a live catalogue

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 10+

### Install

```bash
pnpm install
pnpm build
```

### Quick Start

**Scan for drift:**

```bash
ghost scan --config ghost.config.ts
```

**Generate a design fingerprint:**

```bash
ghost profile --config ghost.config.ts
# or from a shadcn registry directly
ghost profile --registry https://ui.shadcn.com/registry.json
```

**Compare two fingerprints:**

```bash
ghost compare system-a.json system-b.json
```

**Visualize a fleet:**

```bash
ghost viz system-a.json system-b.json system-c.json
```

**Run the ghost-ui catalogue:**

```bash
just dev
# or: cd packages/ghost-ui && pnpm dev
```

## CLI Commands

| Command         | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `ghost scan`    | Detect design drift against a registry                                       |
| `ghost profile` | Generate a design fingerprint from a registry, codebase, or via LLM          |
| `ghost compare` | Compare two fingerprints with optional temporal analysis                     |
| `ghost ack`     | Acknowledge current drift and record a stance (aligned, accepted, diverging) |
| `ghost adopt`   | Shift parent baseline to a new fingerprint                                   |
| `ghost diverge` | Mark a fingerprint dimension as intentionally diverging                      |
| `ghost fleet`   | Compare N fingerprints across an ecosystem                                   |
| `ghost viz`     | Launch interactive 3D fingerprint visualization                              |

## Configuration

Create a `ghost.config.ts` in your project root:

```typescript
import { defineConfig } from "@ghost/core";

export default defineConfig({
  parent: "default",
  designSystems: [
    {
      name: "my-ui",
      registry: "https://ui.shadcn.com/registry.json",
      componentDir: "components/ui",
      styleEntry: "src/styles/main.css",
    },
  ],
  scan: {
    values: true,
    structure: true,
    visual: false,
  },
  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "warn",
    "missing-component": "warn",
  },
});
```

## How It Works

### Drift Scanning

Ghost scans at three levels:

1. **Values** - Detects hardcoded colors, token overrides, and missing tokens by comparing your styles against the registry
2. **Structure** - Diffs component files between your implementation and the registry source
3. **Visual** - Renders components with Playwright and performs pixel-level comparison using pixelmatch

### Design Fingerprinting

A fingerprint is a 64-dimensional vector capturing a system's design characteristics:

| Dimensions | Category     | What it captures                                               |
| ---------- | ------------ | -------------------------------------------------------------- |
| 0-20       | Palette      | Dominant colors (OKLCH), neutrals, semantic coverage, contrast |
| 21-30      | Spacing      | Scale values, regularity, base unit, distribution              |
| 31-40      | Typography   | Font families, size ramp, weight distribution, line heights    |
| 41-48      | Surfaces     | Border radii, shadow complexity, border usage                  |
| 49-63      | Architecture | Tokenization ratio, methodology, component count, naming       |

Fingerprints can be generated deterministically from extracted material, from a shadcn-compatible registry, or with LLM assistance for richer interpretation.

### Evolution Tracking

Ghost tracks design lineage through:

- **`.ghost-sync.json`** - A manifest recording per-dimension stances toward the parent (aligned, accepted, diverging)
- **`.ghost/history.jsonl`** - Append-only fingerprint history for temporal analysis
- **Temporal comparison** - Velocity and trajectory classification to understand drift trends

### Fleet Analysis

Compare fingerprints across multiple systems to get an ecosystem-wide view. Ghost calculates pairwise distances, identifies a centroid, and optionally clusters systems by similarity.

## Ghost UI

Ghost UI (`@ghost/ui`) is the project's reference design language — a shadcn-compatible component registry that serves both as a living design system and as a concrete target for Ghost's drift detection and fingerprinting tools.

### What's included

- **49 primitive components** - Foundational UI building blocks (accordion, button, card, dialog, form, table, tabs, etc.) built on Radix UI and styled with Tailwind CSS
- **48 AI-native elements** - Purpose-built components for conversational and agentic interfaces (prompt input, message, code block, chain of thought, file tree, terminal, tool, etc.)
- **Design tokens** - A full token system (colors, spacing, typography, radii, shadows) defined as CSS custom properties with light and dark mode support
- **Theme system** - Runtime theme switching with presets, a live theme panel for editing tokens, and CSS variable export
- **HK Grotesk typeface** - Self-hosted display font (300–900 weights) paired with system sans-serif for body text
- **Live catalogue** - An interactive documentation site (React + Vite) with component demos, foundations pages, and a bento showcase

### Registry

Ghost UI publishes a `registry.json` conforming to the [shadcn registry schema](https://ui.shadcn.com/docs/registry). Consumers can install individual components directly:

```bash
npx shadcn@latest add --registry https://your-ghost-ui-host/registry.json button card dialog
```

Ghost itself can profile the registry to generate a fingerprint, then scan downstream consumers against it to detect drift:

```bash
ghost profile --registry ./packages/ghost-ui/registry.json
ghost scan --config ghost.config.ts
```

### Catalogue development

```bash
# dev server with hot reload
just dev

# production build
just build-ui

# rebuild the shadcn registry
just build-registry
```

## Project Structure

```
packages/
  ghost-core/          Core library
    src/
      fingerprint/     Fingerprinting engine (embedding, comparison, extraction)
      evolution/       Evolution tracking (sync, temporal, fleet, history)
      scanners/        Drift scanners (values, structure, visual)
      extractors/      Material extraction (CSS, Tailwind)
      resolvers/       Registry and CSS resolution
      llm/             LLM providers (Anthropic, OpenAI)
      reporters/       Output formatting (CLI, JSON, fingerprint, fleet)
  ghost-cli/           CLI interface
    src/
      viz/             3D visualization (Three.js, PCA projection)
  ghost-ui/            Reference design language (@ghost/ui)
    src/
      components/
        ui/            Primitive components (Radix + Tailwind)
        ai-elements/   AI-native components (chat, code, agents)
        theme/         ThemeProvider and theme toggle
        theme-panel/   Live token editor panel
        docs/          Catalogue pages, demos, and bento showcase
      contexts/        Theme and theme-panel context providers
      hooks/           Shared React hooks
      lib/             Utilities, registry helpers, theme presets
      styles/          Design tokens and global CSS
      fonts/           HK Grotesk woff2 files
    registry.json      shadcn-compatible component registry
```

## Development

```bash
# install dependencies
pnpm install

# build all packages
pnpm build

# run tests
pnpm test

# lint and format
pnpm check

# run ghost-ui dev server
just dev
```

A `justfile` is included for common workflows — run `just` to see all available recipes.

## Project Resources

| Resource                             | Description                 |
| ------------------------------------ | --------------------------- |
| [CODEOWNERS](./CODEOWNERS)           | Project lead(s)             |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute           |
| [GOVERNANCE.md](./GOVERNANCE.md)     | Project governance          |
| [LICENSE](./LICENSE)                 | Apache License, Version 2.0 |
