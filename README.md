# Ghost

**Autonomous perception of organic drift across decentralized design consumers.**

Ghost makes design systems legible. It continuously detects divergence between a parent design language and its consumers, generates quantitative fingerprints for comparison, tracks how systems evolve over time, and ships a reference design language as a shadcn-compatible component registry.

## Why Ghost?

Design languages drift — and drift degrades trust. When interfaces lose coherence, the experience suffers regardless of how good the underlying capabilities are. Ghost perceives this drift across an ecosystem so teams can reason about it and act with intent.

- **Continuous scanning** — Detect token overrides, hardcoded values, structural divergence, and pixel-level visual regressions across every consumer
- **Design fingerprinting** — Generate a 64-dimensional profile of any design system — a continuous signal, not a binary check
- **Intent tracking** — Acknowledge, adopt, or intentionally diverge from a parent system. Every stance is published with reasoning and full lineage
- **Fleet observability** — Compare fingerprints across an ecosystem to see the full picture: clusters, outliers, and how consumers relate to each other and the source
- **LLM-aided interpretation** — Optionally use Claude or OpenAI for richer fingerprint generation and drift analysis
- **3D visualization** — Explore fingerprint similarity space in an interactive Three.js viewer
- **Composable design language** — A full shadcn-compatible registry of atomic components, design tokens, and a live catalogue — building blocks that interfaces compose from

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

**Profile a design system:**

```bash
# Profile the current directory
ghost profile .

# Profile a GitHub repo
ghost profile github:shadcn-ui/ui

# Profile with AI enrichment (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
ghost profile github:shadcn-ui/ui --ai --verbose

# Profile a shadcn registry directly
ghost profile --registry https://ui.shadcn.com/registry.json

# Save fingerprint to a file
ghost profile . --output my-system.json
```

**Compare two fingerprints:**

```bash
# Profile two systems, then compare
ghost profile github:shadcn-ui/ui --output shadcn.json
ghost profile npm:@chakra-ui/react --output chakra.json
ghost compare shadcn.json chakra.json
```

**Check compliance against a parent:**

```bash
ghost comply . --against parent-fingerprint.json
ghost comply . --against parent-fingerprint.json --format sarif
```

**Scan for drift (config-based):**

```bash
ghost scan --config ghost.config.ts
```

**Fleet observability and visualization:**

```bash
ghost fleet system-a.json system-b.json system-c.json --cluster
ghost viz system-a.json system-b.json system-c.json
```

**Run the ghost-ui catalogue:**

```bash
just dev
# or: cd packages/ghost-ui && pnpm dev
```

## CLI Commands

| Command          | Description                                                                      |
| ---------------- | -------------------------------------------------------------------------------- |
| `ghost scan`     | Scan for design drift against a registry                                          |
| `ghost profile`  | Generate a fingerprint for any target (directory, URL, npm package, GitHub repo)   |
| `ghost compare`  | Compare two fingerprint JSON files with optional temporal analysis                 |
| `ghost diff`     | Compare local components against registry with drift analysis                      |
| `ghost comply`   | Check design system compliance against rules and a parent fingerprint              |
| `ghost discover` | Find public design systems matching a query                                        |
| `ghost ack`      | Acknowledge current drift — record intentional stance toward parent                |
| `ghost adopt`    | Shift parent baseline to a new fingerprint                                         |
| `ghost diverge`  | Declare intentional divergence on a dimension with reasoning                       |
| `ghost fleet`    | Compare N fingerprint files for ecosystem-level observability                      |
| `ghost viz`      | Launch interactive 3D fingerprint visualization                                    |

### Target Types

`ghost profile` and `ghost comply` accept universal targets:

```bash
ghost profile .                          # current directory
ghost profile ./path/to/project          # local path
ghost profile github:shadcn-ui/ui        # GitHub repo
ghost profile npm:@chakra-ui/react       # npm package
ghost profile https://example.com        # URL
ghost profile --registry registry.json   # shadcn registry directly
```

Use explicit prefixes (`github:`, `npm:`, `figma:`, `path:`, `url:`) when the input is ambiguous.

## Configuration

Optionally create a `ghost.config.ts` in your project root to configure scanning targets, rules, and LLM settings.

```typescript
import { defineConfig } from "@ghost/core";

export default defineConfig({
  // Parent design system to check drift against
  parent: { type: "github", value: "shadcn-ui/ui" },

  // Targets to scan
  targets: [
    { type: "path", value: "./packages/my-ui" },
  ],

  scan: {
    values: true,
    structure: true,
    visual: false,
    analysis: false,
  },

  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
    "visual-regression": "warn",
  },

  ignore: [],

  // LLM provider for AI-powered profiling (optional)
  llm: {
    provider: "anthropic",
    // model: "claude-sonnet-4-20250514",  // optional override
    // apiKey: "..."  // defaults to ANTHROPIC_API_KEY env var
  },

  // Embedding provider for semantic comparison (optional)
  // embedding: {
  //   provider: "openai",
  // },

  // Agent settings (optional)
  // agents: {
  //   maxIterations: 40,
  //   verbose: true,
  // },
});
```

## How It Works

### Scanning

Ghost perceives drift at three levels:

1. **Values** — Detects hardcoded colors, token overrides, and missing tokens by comparing styles against the registry
2. **Structure** — Diffs component files between a consumer implementation and the registry source
3. **Visual** — Renders components with Playwright and performs pixel-level comparison using pixelmatch

### Fingerprinting

A fingerprint is a 64-dimensional vector — a continuous representation of a system's design characteristics:

| Dimensions | Category     | What it captures                                               |
| ---------- | ------------ | -------------------------------------------------------------- |
| 0-20       | Palette      | Dominant colors (OKLCH), neutrals, semantic coverage, contrast |
| 21-30      | Spacing      | Scale values, regularity, base unit, distribution              |
| 31-40      | Typography   | Font families, size ramp, weight distribution, line heights    |
| 41-48      | Surfaces     | Border radii, shadow complexity, border usage                  |
| 49-63      | Architecture | Tokenization ratio, methodology, component count, naming       |

Fingerprints can be generated deterministically from extracted material, from a shadcn-compatible registry, or with LLM assistance for richer interpretation.

### Intent Tracking

Ghost tracks design lineage and published intent through:

- **`.ghost-sync.json`** — Per-dimension stances toward the parent: aligned, accepted, or diverging — each with recorded reasoning
- **`.ghost/history.jsonl`** — Append-only fingerprint history for temporal analysis
- **Temporal comparison** — Velocity and trajectory classification to understand where a system is heading, not just where it is

### Fleet Observability

Compare fingerprints across multiple systems to make an ecosystem legible. Ghost calculates pairwise distances, identifies a centroid, and clusters systems by similarity — surfacing which consumers are coherent, which are drifting, and where gaps exist.

## Ghost UI

Ghost UI (`@ghost/ui`) is the project's reference design language — atomic, composable interface primitives published as a shadcn-compatible registry. It serves as both a living design system and the concrete baseline Ghost scans consumers against.

### What's included

- **49 primitive components** — Foundational building blocks (accordion, button, card, dialog, form, table, tabs, etc.) built on Radix UI and styled with Tailwind CSS
- **48 AI-native elements** — Components for conversational and agentic interfaces: prompt input, message, code block, chain of thought, file tree, terminal, tool, and more — the pieces intelligent interfaces compose from
- **Design tokens** — A full token system (colors, spacing, typography, radii, shadows) defined as CSS custom properties with light and dark mode support
- **Theme system** — Runtime theme switching with presets, a live theme panel for editing tokens, and CSS variable export
- **HK Grotesk typeface** — Self-hosted display font (300–900 weights) paired with system sans-serif for body text
- **Live catalogue** — An interactive documentation site (React + Vite) with component demos, foundations pages, and a bento showcase

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

## Ghost MCP

Ghost MCP (`@ghost/mcp`) is a Model Context Protocol server that exposes the Ghost UI registry to AI assistants.

**Tools:** `search_components`, `get_component`, `get_install_command`, `list_categories`, `get_theme`

**Resources:** `ghost://registry` (full registry JSON), `ghost://skills` (skill docs)

```bash
# Run the MCP server (stdio transport)
node packages/ghost-mcp/dist/bin.js
```

## Project Structure

```
packages/
  ghost-core/          Core library
    src/
      agents/          Director, FingerprintAgent, DiscoveryAgent, ComparisonAgent, ComplianceAgent
      stages/          Deterministic pipeline stages (extract, compare, comply)
      fingerprint/     Fingerprinting engine (embedding, comparison, extraction)
      evolution/       Evolution tracking (sync, temporal, fleet, history)
      scanners/        Drift scanners (values, structure, visual)
      extractors/      Material extraction (CSS, Tailwind)
      resolvers/       Registry and CSS resolution
      llm/             LLM providers (Anthropic, OpenAI)
      reporters/       Output formatting (CLI, JSON, fingerprint, fleet)
  ghost-cli/           CLI interface (citty)
    src/
      bin.ts           Command definitions (scan, profile, compare, diff, comply, discover, etc.)
      evolution-commands.ts  ack, adopt, diverge, fleet commands
      viz/             3D visualization (Three.js, PCA projection)
  ghost-mcp/           MCP server for Ghost UI registry
    src/
      tools.ts         5 MCP tools (search, get, install, categories, theme)
      resources.ts     2 MCP resources (registry, skills)
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
skills/                Claude Code skill definitions
  ghost-fingerprint/   Profile any design system
  ghost-compare/       Compare two design systems
  ghost-drift-check/   Check design compliance
  ghost-discover/      Find public design systems
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
