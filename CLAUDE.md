# Ghost — Agent Context

## Build & Run

```bash
pnpm install          # install dependencies (pnpm 10+, Node 18+)
pnpm build            # build all packages (tsc --build)
```

Run the CLI after building:

```bash
node packages/ghost-cli/dist/bin.js <command>
# or
pnpm --filter ghost-cli exec ghost <command>
```

## Environment Variables

- `ANTHROPIC_API_KEY` — required for AI-powered profiling (`--ai` flag) and LLM agents
- `OPENAI_API_KEY` — alternative LLM provider
- `GITHUB_TOKEN` — optional, for GitHub target resolution and discovery (avoids rate limits)

The CLI auto-loads `.env` and `.env.local` from the working directory.

## Test & Lint

```bash
pnpm test             # vitest run
pnpm test:watch       # vitest watch mode
pnpm check            # biome check + typecheck + file-size check
pnpm fmt              # biome format --write
pnpm lint             # biome lint
```

Pre-commit hook (lefthook): `biome format --write`, `biome check --fix`, `just check`.
Pre-push hook: `just check`, `just test`, `just build` (parallel).

## Justfile

Run `just` to list all recipes. Key ones: `setup`, `build`, `check`, `fmt`, `test`, `dev` (docs site at apps/docs), `build-ui` (docs build), `build-lib` (@ghost/ui library), `build-registry`, `build-pages`, `clean`, `ci`.

## Architecture

**Director** (`packages/ghost-core/src/agents/director.ts`) orchestrates the pipeline:

- **Stages** (`packages/ghost-core/src/stages/`) — deterministic async functions: `extract`, `compare`, `comply`
- **Agents** (`packages/ghost-core/src/agents/`) — LLM-powered steps: `ExpressionAgent`, `DiscoveryAgent`, `ComparisonAgent`, `ComplianceAgent`, `ExtractionAgent`

Typical pipeline: `target → extract (stage) → expression (agent) → compare/comply (stage)`

## Packages

| Package | Description |
|---------|-------------|
| `packages/ghost-core` | Core library: agents, stages, embedding, scanners, extractors, evolution, LLM providers, reporters |
| `packages/ghost-cli` | CLI (cac-based), 11 consolidated subcommands |
| `packages/ghost-ui` | Reference component library — 49 UI primitives + 48 AI elements + theme + hooks, shipped via `dist-lib/` + shadcn `registry.json` |
| `packages/ghost-mcp` | MCP server exposing Ghost UI registry to AI assistants (6 tools, 2 resources) |
| `apps/docs` | The deployed docs site (`@ghost/docs`) — home, drift tooling docs, design language foundations, live component catalogue. Consumes `@ghost/ui`. |
| `action/` | GitHub Action for automated PR design review |

## CLI Commands

| Command | Description |
|---------|-------------|
| `ghost review [scope]` | Unified drift detection. Scopes: `files` (default, code review), `project [target] --against parent.md` (target compliance, CLI/JSON/SARIF) |
| `ghost profile [target]` | Generate an expression — accepts paths, `github:owner/repo`, `npm:package`, URLs |
| `ghost compare [...expressions]` | Unified comparison — pairwise (N=2), fleet (N≥3 or `--cluster`), `--semantic`, `--temporal` |
| `ghost drift` | Diff local components against the registry — reports breaking changes |
| `ghost verify [expression]` | Run the bundled prompt suite through generate→review and classify each dimension as tight/leaky/uncaptured |
| `ghost discover [query]` | Find public design systems |
| `ghost emit <kind>` | Derive artifacts from expression.md — `review-command` (slash command) or `context-bundle` (SKILL.md + tokens + prompt) |
| `ghost generate <prompt>` | LLM-generate UI artifact from expression with self-review retries |
| `ghost lint [expression]` | Lint expression.md schema and body/frontmatter drift |
| `ghost ack` | Acknowledge drift, record stance (aligned/accepted/diverging) |
| `ghost adopt <expression.md>` | Adopt a new parent baseline |
| `ghost diverge <dimension>` | Declare intentional divergence with reasoning |
| `ghost viz <a.md> <b.md> ...` | 3D expression visualization (Three.js) |

## Target Types

The `resolveTarget()` function in `packages/ghost-core/src/config.ts` accepts:

- `github:owner/repo` — GitHub repository
- `npm:package-name` — npm package
- `figma:file-url` — Figma file
- `./path` or `/absolute/path` — local directory
- `https://...` — URL
- `.` — current directory (default for `profile` and `review project`)

Use explicit prefixes when the input is ambiguous.

## Review Pipeline

The `review` module (`packages/ghost-core/src/review/`) provides expression-informed design review:

- **matcher.ts** — deterministic scan: match hardcoded values against expression palette/spacing/typography/surfaces
- **deep-review.ts** — LLM-powered nuanced drift detection (optional, `--deep` flag)
- **file-collector.ts** — git diff parsing to resolve changed files and line numbers
- **pipeline.ts** — orchestrates: resolve expression → collect files → match → (optional) deep review → report

Zero-config: `ghost review` looks for `expression.md` in cwd. Generate with `ghost profile . --emit`.

## Expression format

The canonical expression artifact is **`expression.md`** — a human-readable, LLM-editable Markdown file with YAML frontmatter (machine layer) and a three-layer prose body (Character → Signature → Decisions → Values). See `docs/expression-format.md` for the spec.

- `ghost profile . --emit` writes `expression.md`

## Key Conventions

- Each expression carries a 49-dimensional embedding vector (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]; see `packages/ghost-core/src/embedding/embedding.ts`). The canonical on-disk form is `expression.md`.
- `compare` and `viz` take **file paths** to expression.md, not target strings. `compare` auto-detects mode from flag / N: `--semantic` or `--temporal` require N=2; N≥3 or `--cluster` runs fleet
- `profile` outputs an expression; pipe to `--output <file>` to save (must end in `.md`)
- `--against` on `review project` takes a **file path** to a parent expression.md
- `--ai` enables LLM-powered enrichment on `profile`; `--verbose` shows agent reasoning
- `review` (files scope) reads `expression.md` by default; `--expression <path>` overrides
- `review project` profiles the target and compares against `--against <parent.md>`
- `verify` drives the generate→review loop across a bundled prompt suite
- `drift` diffs the local component tree against the configured registry (no expression args)
- `review --staged` checks only staged changes; `--base main` diffs against a branch
