# CLI Reference

Every Ghost command, its flags, and example usage.

## Overview

Ghost's canonical artifact is `expression.md` — a Markdown file with YAML frontmatter (machine layer) and a three-layer prose body. Most commands accept a path to an `expression.md` or legacy `.ghost-fingerprint.json`; readers dispatch on extension.

Commands are zero-config and default to `./expression.md` in the current directory. `compare --components` is the one exception — it still reads a `ghost.config.ts` for the registry target.

## Profiling

### `ghost profile`

Generate a design fingerprint from one or more targets — a directory, URL, npm package, GitHub repo, or shadcn registry. Produces a 49-dimensional vector plus a three-layer prose expression (Character, Signature, Decisions, Values).

```
ghost profile [...targets] [options]
```

| Flag | Description |
|---|---|
| `-c, --config <path>` | Path to ghost config file |
| `-r, --registry <path>` | Path or URL to a registry.json (profiles registry directly) |
| `-o, --output <file>` | Write fingerprint to a file (.md → expression, else JSON) |
| `--emit` | Write expression.md to project root (publishable artifact) |
| `--ai` | Enable AI-powered enrichment (requires ANTHROPIC_API_KEY or OPENAI_API_KEY) |
| `--max-iterations <n>` | Cap agent exploration iterations (default: 99) |
| `-v, --verbose` | Show agent reasoning, confidence, and warnings |
| `--format <fmt>` | Output format: "cli" (default) or "json" |

```bash
# Profile the current directory, save expression.md
ghost profile . --emit

# Profile a GitHub repo with AI enrichment
ghost profile github:shadcn-ui/ui --ai --verbose

# Profile multiple sources into a single fingerprint
ghost profile github:anthropics/claude-code https://claude.ai --output claude.expression.md

# Profile a remote shadcn registry directly
ghost profile -r https://ui.shadcn.com/registry.json
```

## Comparison

### `ghost compare`

Unified comparison verb. Mode is flag-dispatched: pairwise (N=2), fleet (N≥3 or `--cluster`), semantic diff (`--semantic`), temporal (`--temporal`), or local-components-vs-registry (`--components`).

```
ghost compare [...fingerprints] [options]
```

| Flag | Description |
|---|---|
| `--temporal` | Include temporal data: velocity, trajectory, ack status (N=2 only) |
| `--history-dir <dir>` | Directory containing .ghost/history.jsonl (default: cwd) |
| `--semantic` | Semantic diff of decisions/values/palette (N=2 only) |
| `--cluster` | Include cluster analysis (N≥3) |
| `--components` | Compare local components against registry (reads ghost.config.ts; ignores fingerprint args) |
| `--component <name>` | Limit --components to one component |
| `-c, --config <path>` | Path to ghost config file (for --components) |
| `--format <fmt>` | Output format: "cli" (default) or "json" |

```bash
# Pairwise (N=2)
ghost compare parent.expression.md consumer.expression.md

# With temporal drift analysis
ghost compare parent.expression.md consumer.expression.md --temporal

# Semantic diff (decisions / values / palette)
ghost compare a.expression.md b.expression.md --semantic

# Fleet (N≥3) with clustering
ghost compare *.expression.md --cluster

# Local components vs registry
ghost compare --components

# Single component diff
ghost compare --components --component button
```

### `ghost discover`

Find public design systems matching a query via AI-powered discovery. Useful for bootstrapping comparisons or browsing the ecosystem.

```
ghost discover [query] [options]
```

| Flag | Description |
|---|---|
| `--format <fmt>` | Output format: "cli" (default) or "json" |

```bash
# Find brutalist-leaning systems
ghost discover "brutalist editorial"

# List systems near a reference
ghost discover "similar to shadcn"
```

## Generation Loop

Ghost sits as pipeline infrastructure for AI-driven UI generation. `ghost emit context-bundle` produces a grounding bundle, any generator (including `ghost generate`) produces, `ghost review` gates the output, and `ghost review suite` runs the whole loop over a standard prompt suite to aggregate drift. See [Core Concepts](../tools/drift/concepts) for the shape of the loop.

### `ghost emit`

Derive artifacts from expression.md. Kinds: `review-command` (a per-project drift-review slash command at `.claude/commands/design-review.md`) and `context-bundle` (SKILL.md + tokens.css + optional prompt.md for Claude Code, MCP, v0, Cursor, or any in-house generator).

```
ghost emit <kind> [options]
```

| Flag | Description |
|---|---|
| `-e, --expression <path>` | Source expression file (default: ./expression.md) |
| `-o, --out <path>` | Output path (review-command → `.claude/commands/design-review.md`; context-bundle → `./ghost-context/`) |
| `--stdout` | Write to stdout instead of a file (review-command only) |
| `--no-tokens` | Skip tokens.css output (context-bundle) |
| `--readme` | Include README.md (context-bundle) |
| `--prompt-only` | Emit only prompt.md — skips SKILL.md / expression.md / tokens.css (context-bundle) |
| `--name <name>` | Override the skill name — default: fingerprint id (context-bundle) |

```bash
# Emit a per-project design-review slash command
ghost emit review-command

# Emit a Claude Code / MCP skill bundle
ghost emit context-bundle

# Single prompt.md for plain-text LLM context
ghost emit context-bundle --prompt-only

# Custom output directory
ghost emit context-bundle --out dist/context
```

### `ghost generate`

Reference generator. Loads an expression, builds a system prompt from Character/Signature/Decisions/Values + tokens, calls the LLM, and (by default) runs `ghost review` against its own output, injecting drift feedback and retrying.

```
ghost generate <prompt> [options]
```

| Flag | Description |
|---|---|
| `-e, --expression <path>` | Path to expression.md (default: ./expression.md) |
| `-o, --out <file>` | Write artifact to file (default: stdout) |
| `--format <fmt>` | Output format: "html" (default) |
| `--retries <n>` | Max self-review retries after initial attempt (default: 2, cap 3) |
| `--no-review` | Skip self-review gate (faster, drift-blind) |
| `--json` | Emit structured JSON `{artifact, attempts, passed}` |

```bash
# Generate a pricing page against the current expression
ghost generate "pricing page with three tiers" --out pricing.html

# Fast path: skip the self-review loop
ghost generate "hero section" --no-review --out hero.html

# Machine-readable: per-attempt drift counts
ghost generate "dashboard" --json
```

### `ghost review`

Unified drift detection with three scopes: `files` (default, code-level PR review), `project` (target-level compliance against a parent), `suite` (drive the generate→review loop across a prompt suite, classifying each dimension as *tight*, *leaky*, or *uncaptured*). First positional arg picks the scope; otherwise defaults to files.

```
ghost review [scope] [positional] [options]
```

| Flag | Scope | Description |
|---|---|---|
| `-f, --fingerprint <path>` | files | Path to expression or fingerprint (default: ./expression.md) |
| `--staged` | files | Review staged changes only |
| `-b, --base <ref>` | files | Base ref for git diff (default: HEAD) |
| `--dimensions <list>` | files | Comma-separated: palette, spacing, typography, surfaces |
| `--all` | files | Report issues on all lines, not just changed lines |
| `--against <path>` | project | Parent expression path to check drift against |
| `--max-drift <n>` | project | Maximum overall drift distance (default: 0.3) |
| `-c, --config <path>` | project | Path to ghost config file |
| `--suite <path>` | suite | Path to a prompt suite JSON (default: bundled v0.1) |
| `-n, --n <count>` | suite | Subsample first N prompts (default: run all) |
| `--concurrency <n>` | suite | Max in-flight generate+review calls (default: 3) |
| `--retries <n>` | suite | Self-review retries per prompt (default: 1) |
| `-o, --out <file>` | suite | Write JSON report to file |
| `--format <fmt>` | shared | "cli" (default), "json", "github" (files only), "sarif" (project only) |
| `-v, --verbose` | shared | Verbose output |

```bash
# files scope (default) — review uncommitted changes
ghost review
ghost review --staged --format github
ghost review src/components/hero.tsx -f design.expression.md

# project scope — target-level compliance against a parent
ghost review project . --against parent.expression.md
ghost review project . --against parent.expression.md --format sarif

# suite scope — drive generate→review across a prompt suite
ghost review suite
ghost review suite -n 5
ghost review suite --out suite-report.json
```

## Evolution & Intent

### `ghost ack`

Acknowledge current drift by recording your intentional stance — aligned (tracking parent), accepted (known divergence), or diverging (intentional split). Updates `.ghost-sync.json`.

```
ghost ack [options]
```

| Flag | Description |
|---|---|
| `-c, --config <path>` | Path to ghost config file |
| `-d, --dimension <name>` | Specific dimension to acknowledge (e.g. palette, spacing) |
| `--stance <stance>` | `aligned`, `accepted`, or `diverging` |
| `--reason <text>` | Explanation for this acknowledgment |
| `--format <fmt>` | Output format: "cli" (default) or "json" |

```bash
# Acknowledge all dimensions as aligned
ghost ack --stance aligned --reason "Initial baseline"

# Mark typography as intentionally diverging
ghost ack -d typography --stance diverging --reason "Brand refresh requires different type scale"
```

### `ghost adopt`

Shift the parent baseline to a new expression. Use this when the parent design system has been updated and you want to re-anchor your drift measurements.

```
ghost adopt <source> [options]
```

| Flag | Description |
|---|---|
| `-c, --config <path>` | Path to ghost config file |
| `-d, --dimension <name>` | Only adopt a specific dimension |
| `--format <fmt>` | Output format: "cli" (default) or "json" |

```bash
ghost adopt new-parent.expression.md
```

### `ghost diverge`

Mark a specific dimension as intentionally diverging. Shorthand for `ack --stance diverging` that also records a reason.

```
ghost diverge <dimension> [options]
```

| Flag | Description |
|---|---|
| `-c, --config <path>` | Path to ghost config file |
| `-r, --reason <text>` | Why this dimension is diverging |
| `--format <fmt>` | Output format: "cli" (default) or "json" |

```bash
ghost diverge palette --reason "Dark-mode-first palette for this product"
```

## Visualization

### `ghost viz`

Launch an interactive 3D visualization of fingerprint embeddings using Three.js. Projects the 49-dimensional vectors into 3D space via PCA.

```
ghost viz <fp1> <fp2> [fp3...] [options]
```

| Flag | Description |
|---|---|
| `--port <n>` | HTTP server port (default: 3333) |
| `--no-open` | Don't auto-open the browser |

```bash
# Visualize two expressions
ghost viz parent.expression.md consumer.expression.md

# Visualize a fleet on a custom port
ghost viz *.expression.md --port 8080
```

---

**See also:** walk through the [Core Concepts](../tools/drift/concepts) (animated), or start with [Getting Started](./getting-started) for a guided walkthrough.
