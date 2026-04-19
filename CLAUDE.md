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

Run `just` to list all recipes. Key ones: `setup`, `build`, `check`, `fmt`, `test`, `dev` (ghost-ui catalogue), `build-ui`, `build-registry`, `clean`, `ci`.

## Architecture

**Director** (`packages/ghost-core/src/agents/director.ts`) orchestrates the pipeline:

- **Stages** (`packages/ghost-core/src/stages/`) — deterministic async functions: `extract`, `compare`, `comply`
- **Agents** (`packages/ghost-core/src/agents/`) — LLM-powered steps: `FingerprintAgent`, `DiscoveryAgent`, `ComparisonAgent`, `ComplianceAgent`, `ExtractionAgent`

Typical pipeline: `target → extract (stage) → fingerprint (agent) → compare/comply (stage)`

## Packages

| Package | Description |
|---------|-------------|
| `packages/ghost-core` | Core library: agents, stages, fingerprinting, scanners, extractors, evolution, LLM providers, reporters |
| `packages/ghost-cli` | CLI (citty-based), 12 subcommands |
| `packages/ghost-ui` | Reference design language — 97 shadcn-compatible components, design tokens, live catalogue |
| `packages/ghost-mcp` | MCP server exposing Ghost UI registry to AI assistants (6 tools, 2 resources) |
| `action/` | GitHub Action for automated PR design review |

## CLI Commands

| Command | Description |
|---------|-------------|
| `ghost review [files]` | Review files for visual language drift against a fingerprint (zero-config) |
| `ghost scan` | Scan for design drift (requires `ghost.config.ts`) |
| `ghost profile [target]` | Generate a fingerprint — accepts paths, `github:owner/repo`, `npm:package`, URLs |
| `ghost compare <a.json> <b.json>` | Compare two fingerprint JSON files |
| `ghost diff [component]` | Compare local components against registry |
| `ghost comply [target]` | Check compliance; `--against parent.json` for drift checking |
| `ghost discover [query]` | Find public design systems |
| `ghost fleet <a.json> <b.json> ...` | Ecosystem-level comparison (2+ fingerprint files) |
| `ghost ack` | Acknowledge drift, record stance (aligned/accepted/diverging) |
| `ghost adopt <fingerprint.json>` | Adopt a new parent baseline |
| `ghost diverge <dimension>` | Declare intentional divergence with reasoning |
| `ghost viz <a.json> <b.json> ...` | 3D fingerprint visualization (Three.js) |

## Target Types

The `resolveTarget()` function in `packages/ghost-core/src/config.ts` accepts:

- `github:owner/repo` — GitHub repository
- `npm:package-name` — npm package
- `figma:file-url` — Figma file
- `./path` or `/absolute/path` — local directory
- `https://...` — URL
- `.` — current directory (default for `profile` and `comply`)

Use explicit prefixes when the input is ambiguous.

## Review Pipeline

The `review` module (`packages/ghost-core/src/review/`) provides fingerprint-informed design review:

- **matcher.ts** — deterministic scan: match hardcoded values against fingerprint palette/spacing/typography/surfaces
- **deep-review.ts** — LLM-powered nuanced drift detection (optional, `--deep` flag)
- **file-collector.ts** — git diff parsing to resolve changed files and line numbers
- **pipeline.ts** — orchestrates: resolve fingerprint → collect files → match → (optional) deep review → report

Zero-config: `ghost review` looks for `expression.md` in cwd, with a deprecation-warned fallback to legacy `.ghost-fingerprint.json`. Generate with `ghost profile . --emit`.

## Expression format

The canonical fingerprint artifact is **`expression.md`** — a human-readable, LLM-editable Markdown file with YAML frontmatter (machine layer) and a three-layer prose body (Character → Signature → Decisions → Values). See `docs/expression-format.md` for the spec.

- `ghost profile . --emit` writes `expression.md`
- `ghost profile . --emit-legacy` writes legacy `.ghost-fingerprint.json` (deprecated escape hatch)
- Readers accept both `.md` and `.json` via `loadExpression()` — file extension dispatches

## Key Conventions

- Fingerprints are 49-dimensional vectors (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]; see `packages/ghost-core/src/fingerprint/embedding.ts`). The canonical on-disk form is `expression.md`; `.ghost-fingerprint.json` is a legacy format still accepted by readers.
- `compare`, `fleet`, and `viz` commands take **file paths** to expression.md or legacy JSON, not target strings
- `profile` outputs fingerprints; pipe to `--output <file>` to save (extension `.md` → MD, else JSON)
- `--against` on `comply` takes a **file path** to a parent expression.md or JSON
- `--ai` enables LLM-powered enrichment on `profile`; `--verbose` shows agent reasoning
- `review` reads `expression.md` by default; `--fingerprint <path>` overrides
- `review --deep` requires `ANTHROPIC_API_KEY` for LLM-powered nuanced analysis
- `review --staged` checks only staged changes; `--base main` diffs against a branch
