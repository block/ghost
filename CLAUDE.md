# Ghost — Agent Context

## Build & Run

```bash
pnpm install          # install dependencies (pnpm 10+, Node 18+)
pnpm build            # build all packages (tsc --build)
```

Run the CLI after building:

```bash
node packages/ghost-drift/dist/bin.js <command>
# or
pnpm --filter ghost-drift exec ghost <command>
```

## Environment Variables

Ghost's CLI is deterministic — no API key required for any verb.

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` — optional, consumed only by `computeSemanticEmbedding` (library function; used when a host writes a fingerprint.md and wants an enriched 49-dim vector for paraphrase-robust comparison).
- `GITHUB_TOKEN` — optional, for `resolveParent` fetching a parent fingerprint from GitHub (avoids rate limits).

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

Run `just` to list all recipes. Key ones: `setup`, `build`, `check`, `fmt`, `test`, `dev` (docs site at apps/docs), `build-ui` (docs build), `build-lib` (ghost-ui library), `build-registry`, `build-pages`, `clean`, `ci`.

## Architecture

Ghost is **BYOA (bring-your-own-agent)**. The CLI is a set of **deterministic primitives**. It never calls an LLM. Judgement work (profile, review, verify, generate, discover) belongs to the host agent harness (Claude Code, Codex, Cursor, Goose, etc.), which drives the primitives via an [agentskills.io](https://agentskills.io)-compatible skill bundle. Ghost ships that bundle via `ghost-drift emit skill`.

Engine layout (lives under `packages/ghost-drift/src/core/`):

- `core/compare.ts` — embedding-based comparison (pairwise + fleet)
- `core/embedding/` — 49-dim vector computation, optional semantic embedding via OpenAI/Voyage
- `core/fingerprint/` — parse/compose/diff/lint `fingerprint.md`
- `core/evolution/` — history, ack manifest, fleet analysis, parent resolution
- `core/context/` — artifact generators (review-command, context-bundle, tokens.css)
- `core/reporters/` — output formatters for compare/fleet/temporal/fingerprint

CLI glue sits alongside under `packages/ghost-drift/src/` (`bin.ts`, `cli.ts`, `emit-command.ts`, `evolution-commands.ts`, `target-resolver.ts`, `skill-bundle.ts`). The `./core/index.js` barrel is the single library export; `./cli` is the CLI subpath export.

What was removed in the BYOA migration: the Claude Agent SDK profiling loop (`src/agents/`), the LLM-driven review pipeline (`src/review/`), the LLM generate/verify loops (`src/generate/`, `src/verify/`), the Anthropic/OpenAI provider plumbing (`src/llm/`), and the GitHub Action that wrapped them. Profile, review, verify, generate, and discover are now skill recipes the host agent executes.

## Packages

| Package | Published? | Description |
|---------|-----------|-------------|
| `packages/ghost-drift` | ✅ `ghost-drift` on npm | Merged engine + CLI — deterministic primitives (compare, embedding, fingerprint parse/lint, evolution, reporters) plus the cac-based CLI and the `ghost-drift` agentskills.io skill bundle under `src/skill-bundle/` |
| `packages/ghost-ui` | ❌ private | Reference component library — 49 UI primitives + 48 AI elements + theme + hooks, distributed via the shadcn `registry.json`, not npm |
| `packages/ghost-mcp` | ❌ private | MCP server exposing the Ghost UI component registry to AI assistants (5 tools, 2 resources) — registry lookups only; will be self-hosted |
| `apps/docs` | ❌ private | The deployed docs site (`ghost-docs`) — home, drift tooling docs, design language foundations, live component catalogue. Consumes `ghost-ui`. |

## CLI Commands

Six deterministic primitives. Everything else (profile, review, verify, generate, discover) is a skill recipe the host agent executes.

| Command | Description |
|---------|-------------|
| `ghost-drift compare [...fingerprints]` | Pairwise (N=2) or fleet (N≥3) comparison over fingerprint embeddings. `--semantic`, `--temporal`. |
| `ghost-drift lint [fingerprint.md]` | Validate schema + body/frontmatter coherence |
| `ghost-drift ack` | Acknowledge drift; records stance in `.ghost-sync.json` (reads local `fingerprint.md`) |
| `ghost-drift adopt <fingerprint.md>` | Adopt a new parent baseline |
| `ghost-drift diverge <dimension>` | Declare intentional divergence on a dimension |
| `ghost-drift emit <kind>` | Derive artifacts from `fingerprint.md` — `review-command`, `context-bundle`, or `skill` (the agentskills.io bundle). Run `ghost-drift emit skill` to install the `ghost-drift` skill into your host agent. |

**Workflows the CLI does not do** — these are recipes the host agent follows (all under `packages/ghost-drift/src/skill-bundle/references/`):
- **Profile** (write `fingerprint.md` from a project) — `profile.md`
- **Review** (flag drift in PR changes) — `review.md`
- **Verify** (generate → review loop) — `verify.md`
- **Generate** (produce UI from fingerprint) — `generate.md`
- **Discover** (find public design languages) — `discover.md`

## Target Types

The `resolveTarget()` function in `packages/ghost-drift/src/core/config.ts` accepts:

- `github:owner/repo` — GitHub repository
- `npm:package-name` — npm package
- `figma:file-url` — Figma file
- `./path` or `/absolute/path` — local directory
- `https://...` — URL
- `.` — current directory

Used by `resolveParent` (parent fingerprint resolution) and legacy library consumers. The profile flow itself no longer consumes targets — the host agent explores whatever directory is relevant.

## Fingerprint format

The canonical fingerprint artifact is **`fingerprint.md`** — a human-readable, LLM-editable Markdown file with YAML frontmatter (machine layer) and a three-layer prose body (Character → Signature → Decisions → Values). See `docs/fingerprint-format.md` for the full spec; a condensed reference ships inside the skill bundle at `packages/ghost-drift/src/skill-bundle/references/schema.md`.

## Releasing & Changesets

`ghost-drift` is the single published package. Releases go through [Changesets](https://github.com/changesets/changesets); the `.github/workflows/release.yml` workflow opens a "Version Packages" PR whenever pending changesets are on `main`, and publishes to npm when that PR merges.

**When you (the agent) complete a user-visible change to `packages/ghost-drift/`, write a changeset file yourself instead of asking the user to run `pnpm changeset`.** Create `.changeset/<short-kebab-slug>.md` with this shape:

```markdown
---
"ghost-drift": patch
---

One sentence, user-facing, present tense. What changed from the user's POV — not "refactor the X module."
```

Guidance on the bump level:

- **`patch`** — bug fixes, doc fixes, non-breaking internal refactors. The default; when in doubt, pick this.
- **`minor`** — new CLI verb, new flag, new library export, new capability. Anything a user might want to reach for.
- **`major`** — removed/renamed CLI verb, removed/renamed library export, changed default behavior, breaking fingerprint schema change, changed exit codes. **Always flag this explicitly in the PR description and ask the user to confirm — do not `major`-bump unreviewed.**

Skip the changeset entirely for: CI/workflow-only changes, test-only changes, changes scoped to `packages/ghost-ui`, `packages/ghost-mcp`, or `apps/docs` (all private — not published). The Changesets config ignores those packages.

The slug should be short and descriptive: `add-temporal-flag.md`, `fix-palette-lint-crash.md`. Avoid dates or PR numbers — Changesets consumes and deletes the file at version time.

## Key Conventions

- Each fingerprint carries a 49-dimensional embedding vector (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]; see `packages/ghost-drift/src/core/embedding/embedding.ts`). The canonical on-disk form is `fingerprint.md`.
- `compare` takes **file paths** to `fingerprint.md`, not target strings. Mode auto-detects from N and flags: `--semantic` / `--temporal` require N=2; N≥3 runs fleet.
- `ack` / `adopt` / `diverge` read the local `fingerprint.md`. The host agent is responsible for regenerating `fingerprint.md` (via the profile recipe) before acknowledging drift.
- `lint` takes a single fingerprint.md and reports schema/partition violations. Use as the success gate when writing a fingerprint.
