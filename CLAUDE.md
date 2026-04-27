# Ghost — Agent Context

> **Read [`INVARIANTS.md`](./INVARIANTS.md) before making non-trivial changes.** These are hard constraints — surface conflicts, don't weigh them as preferences.

## Build & Run

```bash
pnpm install          # install dependencies (pnpm 10+, Node 18+)
pnpm build            # build all packages (tsc --build, copies skill-bundle to dist)
```

Run any tool's CLI after building:

```bash
node packages/ghost-drift/dist/bin.js <command>
node packages/ghost-expression/dist/bin.js <command>
node packages/ghost-map/dist/bin.js <command>
node packages/ghost-fleet/dist/bin.js <command>
# or via the workspace
pnpm --filter ghost-drift exec ghost-drift <command>
pnpm --filter ghost-expression exec ghost-expression <command>
```

## Environment Variables

Every CLI verb across every Ghost tool is deterministic — no API key required.

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` — optional, consumed only by `computeSemanticEmbedding` (library function in `@ghost/core`; used when a host writes an `expression.md` and wants an enriched 49-dim vector for paraphrase-robust comparison).
- `GITHUB_TOKEN` — optional, used by `resolveTrackedExpression` when fetching a tracked expression from GitHub (avoids rate limits).

Each CLI auto-loads `.env` and `.env.local` from the working directory.

## Test & Lint

```bash
pnpm test             # vitest run (across all packages)
pnpm test:watch       # vitest watch mode
pnpm check            # biome check + typecheck + file-size check + cli-manifest drift check
pnpm fmt              # biome format --write
pnpm lint             # biome lint
```

Pre-commit hook (lefthook): `biome format --write`, `biome check --fix`, `just check`.
Pre-push hook: `just check`, `just test`, `just build` (parallel).

## Justfile

Run `just` to list all recipes. Key ones: `setup`, `build`, `check`, `fmt`, `test`, `dev` (docs site at apps/docs), `build-ui` (docs build), `build-lib` (ghost-ui library), `build-registry`, `build-pages`, `clean`, `ci`.

## Architecture

Ghost is **BYOA (bring-your-own-agent)**. Every CLI is a set of **deterministic primitives** — none of them call an LLM. Judgement work (profile, review, verify, remediate) lives in [agentskills.io](https://agentskills.io)-compatible skill bundles the host agent (Claude Code, Codex, Cursor, Goose, …) executes.

The repo decomposes into **five tools plus a reference design system**, each with a single responsibility:

```
@ghost/core       library only — embedding math, types, target resolver, skill loader
ghost-map         topology  (map.md)        — inventory, lint
ghost-expression  authoring (expression.md) — lint, describe, diff, emit
ghost-drift       drift     (.ghost/*)      — compare, ack, track, diverge, emit skill
ghost-fleet       elevation (fleet.md)      — members, view, emit skill
ghost-ui          reference design system   — 97 shadcn components + MCP server
```

Dependency flow: `@ghost/core` ← everyone. `ghost-expression` ← `ghost-drift`, `ghost-fleet`. `ghost-map` ← `ghost-fleet`. No cycles.

Each tool lives under `packages/<tool>/` with the same shape:

- `src/bin.ts` — shebang entry
- `src/cli.ts` — `buildCli()` builder (cac)
- `src/core/` — deterministic library surface, public via `src/core/index.ts`
- `src/skill-bundle/` — `SKILL.md` + `references/*.md` (only tools that ship recipes)
- `test/` — vitest, with `test/fixtures/` for sample data

## Packages

| Package | Published? | Description |
|---------|-----------|-------------|
| `packages/ghost-core` | ❌ private (`@ghost/core`) | Workspace-only library. Embedding math, shared types, target resolution, skill-bundle loader. No CLI. Consumed by every other tool. |
| `packages/ghost-drift` | ✅ `ghost-drift` on npm (v0.2+) | Drift detection. CLI verbs: `compare`, `ack`, `track`, `diverge`, `emit skill`. Skill recipes: `compare.md`, `review.md`, `verify.md`, `remediate.md`. Old `lint`/`describe`/`emit review-command`/`emit context-bundle` stay registered as stub commands that point users to `ghost-expression`. |
| `packages/ghost-expression` | ✅ intended-public (`publishConfig.access: public`, currently v0.0.0) | Authoring & validating `expression.md`. CLI verbs: `lint`, `describe`, `diff`, `emit` (kinds: `review-command`, `context-bundle`, `skill`). Skill recipes: `profile.md`, `schema.md`. Owns the canonical artifact. |
| `packages/ghost-map` | ❌ private (currently) | Generates `map.md` — the navigation card every Ghost tool reads. CLI verbs: `inventory` (raw signals as JSON), `lint`. Will eventually publish; gated on the `describe` and `emit skill` follow-ups. |
| `packages/ghost-fleet` | ❌ private | Read-only elevation across many `(map.md, expression.md)` members. CLI verbs: `members`, `view`, `emit skill`. Skill recipes: `target.md`. |
| `packages/ghost-ui` | ❌ private | Reference component library — 49 UI primitives + 48 AI elements + theme + hooks, distributed via the shadcn `registry.json`, not npm. Also ships the `ghost-mcp` bin (`src/mcp/`, built via `tsconfig.mcp.json` → `dist-mcp/`) — an MCP server re-exposing the registry to AI assistants (5 tools, 2 resources). |
| `apps/docs` | ❌ private | The deployed docs site (`ghost-docs`) — home, drift tooling docs, design language foundations, live component catalogue. Consumes `ghost-ui`. |

## CLI Commands

Verbs are scoped to the tool that owns the artifact. The full surface across all four tools:

| Tool | Command | Description |
|------|---------|-------------|
| `ghost-map` | `inventory [path]` | Emit deterministic raw repo signals (manifests, language histogram, registry, top-level tree, git remote) as JSON. |
| `ghost-map` | `lint [map]` | Validate `map.md` against `ghost.map/v1`. |
| `ghost-expression` | `lint [expression]` | Validate `expression.md` schema + body/frontmatter coherence. |
| `ghost-expression` | `describe [expression]` | Print section ranges + token estimates (so agents can selectively load). |
| `ghost-expression` | `diff <a> <b>` | Structural prose-level diff (decisions + palette roles). **Not** vector distance. |
| `ghost-expression` | `emit <kind>` | Derive an artifact from `expression.md`: `review-command`, `context-bundle`, or `skill`. |
| `ghost-drift` | `compare [...expressions]` | Pairwise (N=2) or composite (N≥3) over expression embeddings. `--semantic`, `--temporal`. |
| `ghost-drift` | `ack` | Record a stance toward the tracked expression in `.ghost-sync.json`. |
| `ghost-drift` | `track <expression>` | Shift the tracked expression. |
| `ghost-drift` | `diverge <dimension>` | Declare intentional divergence on a dimension. |
| `ghost-drift` | `emit skill` | Install the `ghost-drift` agentskills.io bundle. |
| `ghost-fleet` | `members [dir]` | List registered fleet members + freshness. |
| `ghost-fleet` | `view [dir]` | Compute pairwise distances + group-by tables; emit `fleet.md` + `fleet.json`. |
| `ghost-fleet` | `emit skill` | Install the `ghost-fleet` agentskills.io bundle. |

**Workflows the CLI does not do** — these are recipes the host agent follows. Each tool ships its own under `packages/<tool>/src/skill-bundle/references/`:

- **Profile** (write `expression.md` from a project) — `ghost-expression/.../profile.md`
- **Map** (write `map.md` from a repo) — `ghost-map/.../map.md`
- **Review** (flag drift in PR changes) — `ghost-drift/.../review.md`
- **Verify** (generate → review loop) — `ghost-drift/.../verify.md`
- **Compare interpretation** — `ghost-drift/.../compare.md`
- **Remediate** (suggest minimal fixes for drift) — `ghost-drift/.../remediate.md`
- **Fleet narrative** (synthesize `fleet.md` prose from CLI output) — `ghost-fleet/.../target.md`

`discover.md` and `generate.md` are dropped from scope in the decomposition (per `docs/ideas/phase-0-decisions.md`); they are not migrated to any tool.

## Target Types

The `resolveTarget()` function in `@ghost/core` (`packages/ghost-core/src/target-resolver.ts`) accepts:

- `github:owner/repo` — GitHub repository
- `npm:package-name` — npm package
- `figma:file-url` — Figma file
- `./path` or `/absolute/path` — local directory
- `https://...` — URL
- `.` — current directory

Used by `resolveTrackedExpression` (in `ghost-drift`) and legacy library consumers. Profile and map flows don't consume targets directly — the host agent explores whatever directory is relevant.

## Canonical artifacts

Two canonical Markdown artifacts, each owned by one tool:

- **`expression.md`** — the design language. Owned by `ghost-expression`. Human-readable, LLM-editable, with YAML frontmatter (machine layer: 49-dim embedding + palette/spacing/typography/surfaces/roles) and a three-section prose body (Character → Signature → Decisions). See `docs/expression-format.md` for the full spec; the condensed reference ships at `packages/ghost-expression/src/skill-bundle/references/schema.md`.
- **`map.md`** — the topology card. Owned by `ghost-map`. Human-readable answer to "where is the design system, which folders matter?" Schema is `ghost.map/v1`, validated by `ghost-map lint`. The condensed reference ships at `packages/ghost-map/src/skill-bundle/references/schema.md`. The repo's own `map.md` lives at the root.

## Releasing & Changesets

`ghost-drift` is the only currently-published package. `ghost-expression` is set up to publish (`publishConfig.access: public`); `ghost-map` and `ghost-fleet` are private workspace-only for now. Releases go through [Changesets](https://github.com/changesets/changesets); the `.github/workflows/release.yml` workflow opens a "Version Packages" PR whenever pending changesets are on `main`, and publishes to npm when that PR merges.

The Changesets config ignores private packages (`@ghost/core`, `ghost-fleet`, `ghost-map`, `ghost-ui`, `apps/docs`) — they don't appear in version PRs.

**When you (the agent) complete a user-visible change to a published package, write a changeset file yourself instead of asking the user to run `pnpm changeset`.** Create `.changeset/<short-kebab-slug>.md` with this shape:

```markdown
---
"ghost-drift": patch
---

One sentence, user-facing, present tense. What changed from the user's POV — not "refactor the X module."
```

Multiple packages can be bumped in one changeset:

```markdown
---
"ghost-drift": patch
"ghost-expression": minor
---
```

Guidance on the bump level:

- **`patch`** — bug fixes, doc fixes, non-breaking internal refactors. The default; when in doubt, pick this.
- **`minor`** — new CLI verb, new flag, new library export, new capability. Anything a user might want to reach for.
- **`major`** — removed/renamed CLI verb, removed/renamed library export, changed default behavior, breaking expression schema change, changed exit codes. **Always flag this explicitly in the PR description and ask the user to confirm — do not `major`-bump unreviewed.**

Skip the changeset entirely for: CI/workflow-only changes, test-only changes, changes scoped to private packages.

The slug should be short and descriptive: `add-temporal-flag.md`, `fix-palette-lint-crash.md`. Avoid dates or PR numbers — Changesets consumes and deletes the file at version time.

## Key Conventions

- Each `expression.md` carries a 49-dimensional embedding vector (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]; see `packages/ghost-core/src/embedding/embedding.ts`). The canonical on-disk form is the Markdown file itself — there is no parallel JSON/DTCG representation (see [`INVARIANTS.md`](./INVARIANTS.md) §2).
- `ghost-drift compare` takes **file paths** to `expression.md`, not target strings. Mode auto-detects from N and flags: `--semantic` / `--temporal` require N=2; N≥3 returns a composite expression.
- `ghost-drift ack` / `track` / `diverge` read the local `expression.md`. The host agent is responsible for regenerating `expression.md` (via the `profile` recipe) before acknowledging drift.
- `ghost-expression lint` takes a single `expression.md` and reports schema/partition violations. Use as the success gate when authoring an expression.
- `ghost-map lint` takes a single `map.md` and validates against `ghost.map/v1`. Use as the success gate when authoring a map.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is auto-generated by `pnpm dump:cli-help`. CI guards drift via `pnpm check:cli-manifest`. Re-run `pnpm dump:cli-help` after adding/removing flags or verbs to any tool.
