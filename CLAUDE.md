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
| `packages/ghost-cli` | CLI (citty-based), 11 subcommands |
| `packages/ghost-ui` | Reference design language — 97 shadcn-compatible components, design tokens, live catalogue |
| `packages/ghost-mcp` | MCP server exposing Ghost UI registry to AI assistants (5 tools, 2 resources) |

## CLI Commands

| Command | Description |
|---------|-------------|
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

## Key Conventions

- Fingerprints are 64-dimensional vectors stored as JSON (`DesignFingerprint` type)
- `compare`, `fleet`, and `viz` commands take **file paths** to fingerprint JSON, not target strings
- `profile` outputs fingerprints; pipe to `--output <file>` to save for later comparison
- `--against` on `comply` takes a **file path** to a parent fingerprint JSON
- `--ai` enables LLM-powered enrichment on `profile`; `--verbose` shows agent reasoning
