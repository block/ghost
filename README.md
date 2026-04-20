# Ghost

**Autonomous perception of organic drift across a decentralized fleet of fingerprint consumers.**

Ghost makes fingerprint legible. It profiles a system's identity into a human-readable `fingerprint.md`, perceives drift across a decentralized fleet of consumers, tracks the stance each consumer takes toward its parent (acknowledge, adopt, diverge), and surfaces fleet-wide signal the parent can heal from. Current scope: visual/UI fingerprint. The reference fingerprint, Ghost UI, ships as a shadcn-compatible component registry. The format and the perception architecture are identity-agnostic; visual is the first instantiation.

## BYOA — bring your own agent

Ghost is split across two surfaces:

- **The CLI** — a set of **deterministic primitives**. Six verbs. It never calls an LLM. It does vector distance, schema validation, and manifest writes. Same answer every time.
- **A skill bundle** — [agentskills.io](https://agentskills.io)-compatible recipes for the interpretive work (profile, review, verify, generate, discover). The host agent (Claude Code, Codex, Cursor, Goose, …) runs the recipes and calls the CLI for the arithmetic.

No API key is required to use any CLI verb. Judgment work lives in whichever agent you already use; `ghost emit skill` installs the recipes there.

## Why Ghost?

Fingerprint drifts. When a system's identity spreads across consumers — each evolving, each adapting — coherence degrades and trust follows. Ghost perceives this drift across a decentralized fleet so the parent can reason about what's happening and heal proactively. No central gatekeeper; observation and recorded intent instead.

- **Human-readable fingerprints** — Every system is captured as a `fingerprint.md`: YAML frontmatter (machine layer) plus a three-layer prose body (Character, Signature, Decisions). Humans read it, LLMs consume it, deterministic tools diff it.
- **Continuous perception** — Profile each consumer over time. Compare embeddings pairwise, across a fleet, or across history.
- **Intent tracking** — Acknowledge, adopt, or intentionally diverge from a parent fingerprint. Every stance is published with reasoning and full lineage. Drift without intent is noise; drift with intent is signal.
- **Fleet intelligence** — Compare fingerprints across an ecosystem to see clusters, outliers, and drift trajectories. The fleet view is the input to proactive healing: when consumers collectively drift toward something, the parent has reason to update itself.
- **Grounded generation** — Use fingerprints as grounding for AI-driven generation. `ghost emit context-bundle` writes skill material for any generator; the review/verify recipes gate the output.
- **Reference fingerprint (Ghost UI)** — A shadcn-compatible registry of atomic components, design tokens, and a live catalogue. Serves as the canonical baseline Ghost profiles and tests itself against in its current visual scope.

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 10+

### Install

```bash
pnpm install
pnpm build
```

### Install the skill into your host agent

```bash
# Writes the ghost-drift skill bundle to ./.claude/skills/ghost-drift
ghost emit skill
```

Once the skill is installed, ask your agent to "profile this design language" or "review this PR for design drift" and it will follow the recipe, calling `ghost` for any deterministic step.

### Quick start

**1. Profile your system** — ask your host agent (Claude Code, Cursor, etc.) to write a `fingerprint.md`. It'll follow the `profile` recipe and validate with `ghost lint` at the end.

**2. Validate the result:**

```bash
ghost lint                                   # defaults to ./fingerprint.md
ghost lint path/to/fingerprint.md --format json
```

**3. Compare fingerprints:**

```bash
# Pairwise — per-dimension distance
ghost compare parent.fingerprint.md consumer.fingerprint.md

# Add qualitative interpretation of decisions + palette
ghost compare a.md b.md --semantic

# Add velocity / trajectory (reads .ghost/history.jsonl)
ghost compare before.md after.md --temporal

# Fleet (N≥3) — pairwise matrix + centroid
ghost compare *.fingerprint.md
```

**4. Track intent toward a parent:**

```bash
ghost ack --stance aligned --reason "Initial baseline"
ghost adopt new-parent.fingerprint.md
ghost diverge typography --reason "Editorial product uses a different type scale"
```

**5. Emit derived artifacts:**

```bash
ghost emit review-command     # .claude/commands/design-review.md (per-project slash command)
ghost emit context-bundle     # ghost-context/ (SKILL.md + tokens.css + prompt.md)
ghost emit skill              # .claude/skills/ghost-drift (the agentskills.io skill bundle)
```

**Run the docs site locally:**

```bash
just dev
# or: pnpm -F @ghost/docs dev
```

## CLI Commands

Six deterministic primitives. Everything else is a skill recipe the host agent runs.

| Command          | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `ghost compare`  | Pairwise distance (N=2) or fleet analysis (N≥3) over fingerprint embeddings. `--semantic` and `--temporal` add qualitative enrichment for N=2. |
| `ghost lint`     | Validate `fingerprint.md` schema + body/frontmatter coherence. Use before declaring a fingerprint valid. |
| `ghost ack`      | Record a stance toward the parent (aligned / accepted / diverging) in `.ghost-sync.json`. |
| `ghost adopt`    | Shift parent baseline to a new fingerprint.                                        |
| `ghost diverge`  | Declare intentional divergence on a dimension with reasoning.                      |
| `ghost emit`     | Derive an artifact from `fingerprint.md`: `review-command`, `context-bundle`, or `skill`. |

### Skill recipes — run by the host agent

Install once with `ghost emit skill`. Your agent then has:

| Recipe     | Triggered by                                    | Source |
| ---------- | ----------------------------------------------- | ------ |
| `profile`  | "profile this", "write a fingerprint.md"         | `packages/ghost-cli/src/skill-bundle/references/profile.md`  |
| `review`   | "review this PR for drift"                       | `packages/ghost-cli/src/skill-bundle/references/review.md`   |
| `verify`   | "verify generated UI against the fingerprint"    | `packages/ghost-cli/src/skill-bundle/references/verify.md`   |
| `generate` | "generate a component matching our design"       | `packages/ghost-cli/src/skill-bundle/references/generate.md` |
| `discover` | "find design languages like X"                   | `packages/ghost-cli/src/skill-bundle/references/discover.md` |
| `compare`  | "why did these two fingerprints drift?"          | `packages/ghost-cli/src/skill-bundle/references/compare.md`  |

These are instructions, not code. The agent executes them using its normal tools (file search, reading, editing) plus `ghost` for the deterministic steps.

### Target types (for skill recipes that fetch externally)

`resolveTarget()` in `packages/ghost-core/src/config.ts` accepts:

- `github:owner/repo` — GitHub repository
- `npm:package-name` — npm package
- `figma:file-url` — Figma file
- `./path` or `/absolute/path` — local directory
- `https://…` — URL
- `.` — current directory

Used by `resolveParent` and by skill recipes that crawl a target. The CLI verbs themselves operate on `fingerprint.md` paths.

## Configuration

`ghost.config.ts` is optional. The CLI verbs that need it (`ack`, `diverge`) use it to locate the parent fingerprint; everything else is zero-config.

```typescript
import { defineConfig } from "@ghost/core";

export default defineConfig({
  // Parent fingerprint to compare against
  parent: { type: "github", value: "shadcn-ui/ui" },

  // Optional scanning hints (unused by the six CLI verbs; available for recipes)
  targets: [{ type: "path", value: "./packages/my-ui" }],

  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
  },

  ignore: [],

  // Optional: use a real embedding model for paraphrase-robust `--semantic`
  // embedding: { provider: "openai" },
});
```

### Environment variables

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` — optional, consumed by `computeSemanticEmbedding` when a host writes a fingerprint.md and wants the enriched 49-dim vector.
- `GITHUB_TOKEN` — optional, used by `resolveParent` when fetching a parent fingerprint from GitHub (avoids rate limits).

The CLI auto-loads `.env` and `.env.local` from the working directory.

## How It Works

### The fingerprint

The canonical artifact is **`fingerprint.md`** — a Markdown document with YAML frontmatter (machine layer) plus a three-layer prose body. Human-readable, LLM-consumable, diff-friendly:

- **Frontmatter** — 49-dimensional embedding, palette, spacing, typography, surfaces, roles, provenance. What deterministic tools read.
- **`# Character`** — the opening atmosphere read: evocative, not technical. What an agent quotes to stay on-brand.
- **`# Signature`** — 3–7 distinctive traits that make _this_ system unlike its peers. The drift-sensitive moves.
- **`# Decisions`** — abstract, implementation-agnostic choices with evidence. Each decision is embedded so `compare --semantic` can match semantically.

Generate one with the `profile` recipe. See [`docs/fingerprint-format.md`](./docs/fingerprint-format.md) for the full spec. A condensed reference ships inside the skill bundle at `packages/ghost-cli/src/skill-bundle/references/schema.md`.

The 49-dim machine vector splits like this:

| Dimensions | Category   | What it captures                                               |
| ---------- | ---------- | -------------------------------------------------------------- |
| 0-20       | Palette    | Dominant colors (OKLCH), neutrals, semantic coverage, contrast |
| 21-30      | Spacing    | Scale values, regularity, base unit, distribution              |
| 31-40      | Typography | Font families, size ramp, weight distribution, line heights    |
| 41-48      | Surfaces   | Border radii, shadow complexity, border usage                  |

### Generation loop

Ghost doubles as pipeline infrastructure for AI-driven generation. The fingerprint grounds the generator; the `review` recipe surfaces drift in the output so humans can decide whether to acknowledge, adopt, or diverge:

```
fingerprint.md ──► [ghost emit context-bundle] ──► SKILL.md / tokens.css / prompt.md
                                          │
                                          ▼
                                   any generator
                            (host agent, Cursor, v0,
                             in-house tool)
                                          │
                                          ▼ HTML / JSX
                                   [review recipe]  ──►  drift signal
                                                        (annotate / acknowledge /
                                                         adopt / diverge)
```

The `verify` recipe drives the loop across a prompt suite and classifies each dimension as _tight_, _leaky_, or _uncaptured_ — the mechanism that tells the fingerprint where it needs to say more. See [`docs/generation-loop.md`](./docs/generation-loop.md) for details.

### Intent tracking

Ghost tracks design lineage and published intent through:

- **`fingerprint.md`** — The canonical fingerprint artifact.
- **`.ghost-sync.json`** — Per-dimension stances toward the parent: aligned, accepted, or diverging — each with recorded reasoning. Written by `ack` / `adopt` / `diverge`.
- **`.ghost/history.jsonl`** — Append-only fingerprint history for temporal analysis. Read by `compare --temporal`.

### Fleet observability

Run `ghost compare` with three or more fingerprints to see pairwise distances, a centroid, and similarity clusters — which consumers are coherent, which are drifting, and where the gaps are.

## Ghost UI

Ghost UI (`@ghost/ui`) is the project's reference design language — atomic, composable interface primitives published as a shadcn-compatible registry. It serves as both a living design language and the concrete baseline Ghost scans consumers against.

### What's included

- **49 primitive components** — Foundational building blocks (accordion, button, card, dialog, form, table, tabs, …) built on Radix UI and styled with Tailwind CSS.
- **48 AI-native elements** — Components for conversational and agentic interfaces: prompt input, message, code block, chain of thought, file tree, terminal, tool, and more.
- **Design tokens** — A full token system (colors, spacing, typography, radii, shadows) defined as CSS custom properties with light and dark mode support.
- **Theme system** — Runtime theme switching with presets, a live theme panel, and CSS variable export.
- **HK Grotesk typeface** — Self-hosted display font (300–900 weights) paired with system sans-serif for body text.
- **Docs site** — Interactive documentation (React + Vite) with drift tooling docs, design-language foundations, a live component catalogue, and a bento showcase.

### Registry

Ghost UI publishes a `registry.json` conforming to the [shadcn registry schema](https://ui.shadcn.com/docs/registry). Consumers can install individual components directly:

```bash
npx shadcn@latest add --registry https://your-ghost-ui-host/registry.json button card dialog
```

Ghost itself can profile the registry to generate a fingerprint — the host agent runs the `profile` recipe against `./packages/ghost-ui/` — and check downstream consumers against it with the `review` recipe.

### Docs site development

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
  ghost-core/          Core library — deterministic primitives
    src/
      compare.ts       Embedding-based comparison (pairwise + fleet)
      config.ts        Config loading + target resolution
      embedding/       49-dim vector, optional semantic embedding
      fingerprint/     parse / compose / diff / lint fingerprint.md
      evolution/       history, ack manifest, fleet analysis, parent resolution
      context/         artifact generators (review-command, context-bundle, tokens.css)
      reporters/       output formatters for compare / fleet / temporal / fingerprint
  ghost-cli/           CLI (cac) — 6 verbs
    src/
      bin.ts                  compare, lint
      emit-command.ts         emit (review-command | context-bundle | skill)
      evolution-commands.ts   ack, adopt, diverge
      skill-bundle/           The shipped ghost-drift skill bundle
        SKILL.md              Skill entry point
        references/           profile / review / verify / generate / discover / compare / schema
        assets/                fingerprint.template.md, other static assets
  ghost-mcp/           MCP server for Ghost UI registry
    src/
      tools.ts         5 MCP tools
      resources.ts     2 MCP resources
  ghost-ui/            Reference component library (@ghost/ui)
    src/
      index.ts
      components/
        ui/            49 primitive components
        ai-elements/   48 AI-native components
        theme/         ThemeProvider, ThemeToggle
      hooks/
      lib/             cn + theme presets / defaults / utils
      styles/          Design tokens, global CSS
      fonts/           HK Grotesk woff2 files
    registry.json      shadcn-compatible component registry
apps/
  docs/                Deployed site (@ghost/docs)
    src/
      app/             Routes: /, /tools, /tools/drift/*, /ui/*
      components/
        docs/          Page layout, demos, bento showcase
        theme-panel/   Live token editor panel
      contexts/
      lib/
    vite.config.ts     base = DEPLOY_BASE env
docs/
  fingerprint-format.md  The fingerprint.md spec
  generation-loop.md     Emit → generate → review pipeline
```

## Development

```bash
# install dependencies
pnpm install

# build all packages
pnpm build

# run tests
pnpm test

# lint, format, typecheck, file-size check
pnpm check

# run the docs site
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
