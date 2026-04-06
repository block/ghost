# Ghost

**Design drift detection and fingerprinting for design systems.**

Ghost detects unintentional divergence between a parent design language and its consumer implementations. It scans for drift across values, structure, and visual dimensions, generates design fingerprints for comparison, and tracks how systems evolve over time.

## Why Ghost?

Design languages drift. Teams override tokens, hardcode colors, restructure components, and make visual changes that silently diverge from the source of truth. Drift can be neutral. Sometimes organic. Sometimes a mistake. Sometimes intentional. Ghost catches this drift.

- **Multi-dimensional scanning** - Detect token overrides, hardcoded values, structural divergence, and pixel-level visual regressions
- **Design fingerprinting** - Generate a 64-dimensional numeric profile of any design system for quantitative comparison
- **Evolution tracking** - Acknowledge, adopt, or intentionally diverge from a parent system with full lineage history
- **Fleet analysis** - Compare fingerprints across an ecosystem to identify clusters and outliers
- **LLM-powered interpretation** - Optionally use Claude or OpenAI for richer fingerprint generation
- **3D visualization** - Explore fingerprint similarity space in an interactive Three.js viewer

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
```

## Project Resources

| Resource                             | Description                 |
| ------------------------------------ | --------------------------- |
| [CODEOWNERS](./CODEOWNERS)           | Project lead(s)             |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute           |
| [GOVERNANCE.md](./GOVERNANCE.md)     | Project governance          |
| [LICENSE](./LICENSE)                 | Apache License, Version 2.0 |
