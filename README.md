# Ghost

**Autonomous perception of organic drift across a decentralized fleet of expression consumers.**

Ghost makes expression legible. It fingerprints a system's identity as a human-readable `expression.md`, perceives drift across a decentralized fleet of consumers, tracks the stance each consumer takes toward its parent (acknowledge, adopt, diverge), and surfaces fleet-wide signal the parent can heal from. Current scope: visual/UI expression. The reference expression, Ghost UI, ships as a shadcn-compatible component registry. The format and the perception architecture are identity-agnostic; visual is the first instantiation.

## Why Ghost?

Expression drifts. When a system's identity spreads across consumers — each evolving, each adapting — coherence degrades and trust follows. Ghost perceives this drift across a decentralized fleet so the parent can reason about what's happening and heal proactively. No central gatekeeper; observation and recorded intent instead.

- **Human-readable fingerprints** — Every system is captured as an `expression.md`: YAML frontmatter (machine layer) plus a three-layer prose body (Character, Signature / Observation, Decisions, Values). Humans read it, LLMs consume it, deterministic tools diff it
- **Continuous perception** — Fingerprint each consumer over time. Surface drift at the values (hardcoded colors, token overrides, missing tokens), structural (component divergence), and visual (pixel-level regressions) levels
- **Grounded generation** — Use expressions as grounding for AI-driven generation. `ghost emit context-bundle` writes prompt/skill material; any generator produces; `ghost review` surfaces drift in the output; `ghost review suite` aggregates drift across a standard prompt suite to classify dimensions as tight, leaky, or uncaptured
- **Intent tracking** — Acknowledge, adopt, or intentionally diverge from a parent expression. Every stance is published with reasoning and full lineage. Drift without intent is noise; drift with intent is signal
- **Fleet intelligence** — Compare fingerprints across an ecosystem to see clusters, outliers, and drift trajectories. The fleet view is the input to proactive healing: when consumers collectively drift toward something, the parent has reason to update itself
- **LLM-aided interpretation** — Optionally use Claude or OpenAI for richer fingerprint generation and drift analysis
- **3D visualization** — Explore fingerprint similarity space in an interactive Three.js viewer
- **Reference expression (Ghost UI)** — A shadcn-compatible registry of atomic components, design tokens, and a live catalogue. Serves as the canonical baseline Ghost profiles and tests itself against in its current visual scope

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

# Save a fingerprint as expression.md (recommended)
ghost profile . --emit                   # writes ./expression.md
ghost profile . --output my-system.md    # or write to a specific path
```

**Compare two fingerprints:**

```bash
# Profile two systems, then compare
ghost profile github:shadcn-ui/ui --output shadcn.expression.md
ghost profile npm:@chakra-ui/react --output chakra.expression.md
ghost compare shadcn.expression.md chakra.expression.md

# Legacy JSON still works
ghost compare shadcn.json chakra.json
```

**Review drift — one verb, three scopes:**

```bash
# files scope (default): zero-config PR review against ./expression.md
ghost review
ghost review --staged --format github

# project scope: target-level coherence against a parent (CLI/JSON/SARIF)
ghost review project . --against parent.expression.md
ghost review project . --against parent.expression.md --format sarif

# suite scope: drive the generate→review loop across a bundled prompt suite
ghost review suite
```

**Generation loop — ground, generate, observe:**

```bash
# Emit a Claude Code / MCP skill bundle from an expression
ghost emit context-bundle --out skills/my-design

# Reference generator with built-in self-review retries
ghost generate "pricing page with three tiers" --out pricing.html
```

**Fleet observability and visualization:**

```bash
ghost compare system-a.expression.md system-b.expression.md system-c.expression.md --cluster
ghost viz system-a.expression.md system-b.expression.md system-c.expression.md
```

**Run the ghost-ui catalogue:**

```bash
just dev
# or: cd packages/ghost-ui && pnpm dev
```

## CLI Commands

| Command          | Description                                                                      |
| ---------------- | -------------------------------------------------------------------------------- |
| `ghost profile`  | Generate a fingerprint for any target (directory, URL, npm package, GitHub repo)   |
| `ghost compare`  | Compare 2+ expressions (pairwise, fleet, semantic, temporal, or components-vs-registry via flags) |
| `ghost review`   | Unified drift perception. Scopes: `files` (default, PR drift check), `project [target] --against parent.md` (target coherence against a parent), `suite [expression]` (prompt-suite verification) |
| `ghost discover` | Find public design systems matching a query                                        |
| `ghost emit`     | Derive artifacts from expression.md — `review-command` (slash command) or `context-bundle` (SKILL.md + tokens.css + prompt.md) |
| `ghost generate` | Reference generator — LLM → HTML with self-review retries against an expression    |
| `ghost lint`     | Lint expression.md schema and body/frontmatter drift                               |
| `ghost ack`      | Acknowledge current drift — record intentional stance toward parent                |
| `ghost adopt`    | Shift parent baseline to a new expression                                          |
| `ghost diverge`  | Declare intentional divergence on a dimension with reasoning                       |
| `ghost viz`      | Launch interactive 3D fingerprint visualization                                    |

### Target Types

`ghost profile` and `ghost review project` accept universal targets:

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
  // Parent design system to compare components against
  parent: { type: "github", value: "shadcn-ui/ui" },

  // Targets for `ghost compare --components`
  targets: [
    { type: "path", value: "./packages/my-ui" },
  ],

  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
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

### The Expression

Ghost's canonical artifact is **`expression.md`** — a Markdown document with YAML frontmatter (machine layer) plus a three-layer prose body. It's human-readable, LLM-consumable, and diff-friendly:

- **Frontmatter** — 49-dimensional embedding, palette, spacing, typography, surfaces, provenance. What deterministic tools read
- **`# Character`** — the opening atmosphere read: evocative, not technical. What an agent quotes to stay on-brand
- **`# Signature`** — 3–7 distinctive traits that make _this_ system unlike its peers. The drift-sensitive moves
- **`# Observation`** — prose paired with the frontmatter data, dimension by dimension
- **`# Decisions`** — abstract, implementation-agnostic choices with evidence. Each decision is embedded so `compare` can match semantically
- **`# Values`** — do / don't rules, surfaced as hard-line signal in `ghost review`

Generate one with `ghost profile . --emit`. See [`docs/expression-format.md`](./docs/expression-format.md) for the full spec.

The 49-dim machine vector splits like this:

| Dimensions | Category   | What it captures                                               |
| ---------- | ---------- | -------------------------------------------------------------- |
| 0-20       | Palette    | Dominant colors (OKLCH), neutrals, semantic coverage, contrast |
| 21-30      | Spacing    | Scale values, regularity, base unit, distribution              |
| 31-40      | Typography | Font families, size ramp, weight distribution, line heights   |
| 41-48      | Surfaces   | Border radii, shadow complexity, border usage                  |

### Scanning

Ghost perceives drift at three levels:

1. **Values** — Detects hardcoded colors, token overrides, and missing tokens by comparing styles against the registry
2. **Structure** — Diffs component files between a consumer implementation and the registry source
3. **Visual** — Renders components with Playwright and performs pixel-level comparison using pixelmatch

### Generation Loop

Ghost doubles as pipeline infrastructure for AI-driven generation — the expression grounds the generator, and `ghost review` surfaces drift in the output so humans can decide whether to acknowledge, adopt, or diverge:

```
expression.md ──► [ghost emit context-bundle] ──► SKILL.md / tokens.css / prompt.md
                                          │
                                          ▼
                                   any generator
                               (ghost generate, Cursor,
                                v0, in-house tool)
                                          │
                                          ▼ HTML / JSX
                                   [ghost review] ──► drift signal
                                                      (annotate / acknowledge /
                                                       adopt / diverge)
```

Run `ghost review suite` to drive the loop across a versioned prompt suite and classify each dimension as _tight_, _leaky_, or _uncaptured_ — the mechanism that tells the expression where it needs to say more. See [`docs/generation-loop.md`](./docs/generation-loop.md) for details.

### Intent Tracking

Ghost tracks design lineage and published intent through:

- **`expression.md`** — The current fingerprint artifact (replaces the legacy `.ghost-fingerprint.json`, still readable for back-compat)
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

Ghost itself can profile the registry to generate a fingerprint, then check downstream consumers against it to detect drift:

```bash
ghost profile --registry ./packages/ghost-ui/registry.json --emit
ghost review project ./consumer-app --against expression.md
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
  ghost-cli/           CLI interface (cac)
    src/
      bin.ts                 profile, scan, diff, compare, comply, discover
      review-command.ts      review (expression-aware drift signal)
      context-command.ts     context (emit skill / prompt / bundle)
      generate-command.ts    generate (reference LLM generator with self-review)
      verify-command.ts      verify (generate→review loop over prompt suite)
      evolution-commands.ts  ack, adopt, diverge, fleet
      viz/                   3D visualization (Three.js, PCA projection)
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
  ghost-review/        Review files for drift against an expression
docs/
  expression-format.md The expression.md spec
  generation-loop.md   Context → generate → review → verify pipeline
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
