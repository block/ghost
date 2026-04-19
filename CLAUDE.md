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
- **Agents** (`packages/ghost-core/src/agents/`) — LLM-powered steps: `FingerprintAgent`, `DiscoveryAgent`, `ComparisonAgent`, `ComplianceAgent`, `ExtractionAgent`

Typical pipeline: `target → extract (stage) → fingerprint (agent) → compare/comply (stage)`

## Packages

| Package | Description |
|---------|-------------|
| `packages/ghost-core` | Core library: agents, stages, fingerprinting, scanners, extractors, evolution, LLM providers, reporters |
| `packages/ghost-cli` | CLI (cac-based), 11 consolidated subcommands |
| `packages/ghost-ui` | Reference component library — 49 UI primitives + 48 AI elements + theme + hooks, shipped via `dist-lib/` + shadcn `registry.json` |
| `packages/ghost-mcp` | MCP server exposing Ghost UI registry to AI assistants (6 tools, 2 resources) |
| `apps/docs` | The deployed docs site (`@ghost/docs`) — home, drift tooling docs, design language foundations, live component catalogue. Consumes `@ghost/ui`. |
| `action/` | GitHub Action for automated PR design review |

## CLI Commands

| Command | Description |
|---------|-------------|
| `ghost review [scope]` | Unified drift detection. Scopes: `files` (default, code review), `project [target] --against parent.md` (target compliance, CLI/JSON/SARIF), `suite [expression]` (prompt-suite verification) |
| `ghost profile [target]` | Generate a fingerprint — accepts paths, `github:owner/repo`, `npm:package`, URLs |
| `ghost compare [...expressions]` | Unified comparison — pairwise (N=2), fleet (N≥3 or `--cluster`), `--semantic`, `--temporal`, or `--components` (local vs registry) |
| `ghost discover [query]` | Find public design systems |
| `ghost emit <kind>` | Derive artifacts from expression.md — `review-command` (slash command) or `context-bundle` (SKILL.md + tokens + prompt) |
| `ghost generate <prompt>` | LLM-generate UI artifact from expression with self-review retries |
| `ghost lint [expression]` | Lint expression.md schema and body/frontmatter drift |
| `ghost ack` | Acknowledge drift, record stance (aligned/accepted/diverging) |
| `ghost adopt <expression.md>` | Adopt a new parent baseline |
| `ghost diverge <dimension>` | Declare intentional divergence with reasoning |
| `ghost viz <a.md> <b.md> ...` | 3D fingerprint visualization (Three.js) |

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

The `review` module (`packages/ghost-core/src/review/`) provides fingerprint-informed design review:

- **matcher.ts** — deterministic scan: match hardcoded values against fingerprint palette/spacing/typography/surfaces
- **deep-review.ts** — LLM-powered nuanced drift detection (optional, `--deep` flag)
- **file-collector.ts** — git diff parsing to resolve changed files and line numbers
- **pipeline.ts** — orchestrates: resolve fingerprint → collect files → match → (optional) deep review → report

Zero-config: `ghost review` looks for `expression.md` in cwd, with a deprecation-warned fallback to legacy `.ghost-fingerprint.json`. Generate with `ghost profile . --emit`.

## Expression format

The canonical fingerprint artifact is **`expression.md`** — a human-readable, LLM-editable Markdown file with YAML frontmatter (machine layer) and a three-layer prose body (Character → Signature → Decisions → Values). See `docs/expression-format.md` for the spec.

- `ghost profile . --emit` writes `expression.md`
- Readers accept both `.md` and legacy `.ghost-fingerprint.json` via `loadExpression()` — file extension dispatches. Writing legacy JSON is no longer supported; consume `expression.md` instead

## Key Conventions

- Fingerprints are 49-dimensional vectors (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]; see `packages/ghost-core/src/fingerprint/embedding.ts`). The canonical on-disk form is `expression.md`; `.ghost-fingerprint.json` is a legacy format still accepted by readers.
- `compare` and `viz` take **file paths** to expression.md or legacy JSON, not target strings. `compare` auto-detects mode from flag / N: `--semantic` or `--temporal` require N=2; N≥3 or `--cluster` runs fleet; `--components` compares local components vs registry (no fingerprint args)
- `profile` outputs fingerprints; pipe to `--output <file>` to save (extension `.md` → MD, else JSON)
- `--against` on `review project` takes a **file path** to a parent expression.md or JSON
- `--ai` enables LLM-powered enrichment on `profile`; `--verbose` shows agent reasoning
- `review` (files scope) reads `expression.md` by default; `--fingerprint <path>` overrides
- `review project` profiles the target and compares against `--against <parent.md>`
- `review suite` drives the generate→review loop across a bundled prompt suite
- `review --staged` checks only staged changes; `--base main` diffs against a branch
