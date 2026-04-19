# Getting Started

Profile a design system, emit an expression, and gate generated UI against it — in under five minutes.

## Installation

Add the core library and CLI to your project:

```bash
pnpm add -D @ghost/core @ghost/cli
```

Or install globally to use `ghost` from anywhere:

```bash
pnpm add -g @ghost/cli
```

AI-powered commands (`profile --ai`, `review project`, `review suite`, `discover`, `generate`) need `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in your environment. Ghost auto-loads `.env` and `.env.local` from the working directory.

## Profile Your First System

Ghost is zero-config for profiling. Point it at any target — a directory, GitHub repo, npm package, URL, or shadcn registry — and it produces an `expression.md`: the canonical fingerprint artifact.

```bash
# The current directory — writes ./expression.md
ghost profile . --emit

# A GitHub repo with AI enrichment
ghost profile github:shadcn-ui/ui --ai --output shadcn.expression.md

# A shadcn registry directly
ghost profile --registry https://ui.shadcn.com/registry.json
```

An **expression** is a Markdown file with YAML frontmatter (the machine layer: 49-dim vector, palette, spacing, typography, surfaces) plus a prose body in three layers: Character, Signature / Observation, Decisions, Values. Humans can read it. LLMs can consume it. Deterministic tools can diff it.

## Compare Two Systems

Once you have two expressions, compare them to see exactly where they diverge:

```bash
ghost compare parent.expression.md consumer.expression.md
```

`compare` weights palette, spacing, typography, surfaces, and embedded decisions, and returns a scalar distance plus per-dimension deltas. Add `--temporal` for velocity and trajectory (requires `.ghost/history.jsonl`).

## Review Drift — One Verb, Three Scopes

`ghost review` is the unified drift-detection verb. The first positional argument picks the scope; it defaults to `files`.

- **`ghost review`** (files scope, default) — checks files in a PR for visual language drift: hardcoded colors outside the palette, spacing off the scale, typography that violates decisions. Reads `./expression.md`; flags changed lines only by default.
- **`ghost review project [target] --against parent.md`** — target-level compliance. Profiles the target, compares to the parent, exits non-zero if drift exceeds `--max-drift`. Emits CLI, JSON, or SARIF for CI.
- **`ghost review suite [expression]`** — drives the generate→review loop across a bundled prompt suite (~18 prompts) and classifies each dimension as *tight*, *leaky*, or *uncaptured*. The schema-discipline mechanism for expressions.

```bash
# files — review uncommitted changes
ghost review
ghost review --staged --format github
ghost review src/app/page.tsx -f design.expression.md

# project — drop-in CI gate against a parent
ghost review project . --against parent.expression.md
ghost review project . --against parent.expression.md --format sarif

# suite — drive the loop across the bundled prompt suite
ghost review suite
ghost review suite -n 5
ghost review suite --out suite-report.json
```

SARIF output from `review project` plugs into GitHub code scanning and most CI platforms.

## The Generation Loop

Ghost doubles as pipeline infrastructure for AI-generated UI:

1. **`ghost emit context-bundle`** — emit a grounding bundle from an expression (SKILL.md + tokens.css + optional prompt.md) that any generator can consume.
2. **Run any generator** (`ghost generate`, Cursor, v0, or in-house) with the bundle in context.
3. **`ghost review`** gates the output. **`ghost review suite`** runs the whole loop across a standard prompt suite and aggregates per-dimension drift.

```bash
# Emit a Claude Code skill bundle from an expression
ghost emit context-bundle --out skills/my-design

# Reference generator with self-review
ghost generate "pricing page with three tiers" --out pricing.html

# Drive the suite against the standard prompt set
ghost review suite
```

## Advanced: Config-Driven Component Diff

For projects consuming a shadcn-style registry, `ghost compare --components` reads a `ghost.config.ts` that points at the parent registry and compares local component files against it:

```typescript
import { defineConfig } from "@ghost/core";

export default defineConfig({
  parent: { type: "github", value: "shadcn-ui/ui" },
  targets: [{ type: "path", value: "./packages/my-ui" }],

  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
  },

  // Optional: LLM and embedding providers
  llm: { provider: "anthropic" },
  // embedding: { provider: "openai" },
});
```

With a config in place, `ghost compare --components` surfaces structural drift against the parent registry. Pass `--format json` for machine-readable output.

---

**Next:** walk through the [Core Concepts](../tools/drift/concepts) (animated) for the three-layer fingerprint model and the generation-loop architecture. Or jump to the [CLI Reference](./cli) for every command and flag.
