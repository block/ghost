# Ghost

Agents can ship UI now. The problem: what they ship drifts — wrong palette, wrong density, wrong hierarchy — because they have no canonical answer to "what does this project's design language *actually* look like."

Ghost is the layer that gives them one. The design language lives in your repo as `fingerprint.md`. Agents read it before generating, compare against it after, and either correct the drift or codify the divergence as a deliberate change. A scan runs in three stages — map (`map.md`) → survey (`survey.json`) → express (`fingerprint.md`) — all owned by `ghost-fingerprint`. Four tools plus a reference design system split the loop:

- **ghost-fingerprint** — authors all three scan artifacts (`map.md`, `survey.json`, `fingerprint.md`); the canonical home of the design language
- **ghost-drift** — when generated UI strays
- **ghost-fleet** — how the language propagates across many projects
- **ghost-ui** — a reference design system to test the loop against

## Build & Run

```bash
pnpm install          # install dependencies (pnpm 10+, Node 18+)
pnpm build            # build all packages (tsc --build, copies skill-bundle to dist)
```

Run any tool's CLI after building:

```bash
node packages/ghost-drift/dist/bin.js <command>
node packages/ghost-fingerprint/dist/bin.js <command>
node packages/ghost-fleet/dist/bin.js <command>
# or via the workspace
pnpm --filter ghost-drift exec ghost-drift <command>
pnpm --filter ghost-fingerprint exec ghost-fingerprint <command>
```

## Environment Variables

No API key is required to run Ghost. The variables below are optional.

- `OPENAI_API_KEY` / `VOYAGE_API_KEY` — consumed only by `computeSemanticEmbedding` (library function in `@ghost/core`; used when a host writes an `fingerprint.md` and wants an enriched 49-dim vector for paraphrase-robust comparison).
- `GITHUB_TOKEN` — used by `resolveTrackedFingerprint` when fetching a tracked fingerprint from GitHub (avoids rate limits).

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

Ghost is **BYOA (bring-your-own-agent)**. The host agent — Claude Code, Codex, Cursor, Goose, whatever ships next — does the reading, deciding, and writing. The judgement work (profile, review, verify, remediate) lives in [agentskills.io](https://agentskills.io)-compatible skill bundles the agent executes. Ghost's CLIs are the calculator the agent reaches for when it needs a reproducible answer (vector math, schema validation, structural diffs).

The repo decomposes into **four tools plus a reference design system**, each with a single responsibility:

```
@ghost/core       library only — embedding math, target resolver, skill loader,
                                  ghost.map/v2 schema, ghost.survey/v2 schema
ghost-fingerprint  scan pipeline (map.md → survey.json → fingerprint.md)
                                   — inventory, lint, describe, diff, survey, emit
ghost-drift       drift     (.ghost/*)      — compare, ack, track, diverge, emit skill
ghost-fleet       elevation (fleet.md)      — members, view, emit skill
ghost-ui          reference design system   — 97 shadcn components + MCP server
```

Dependency flow: `@ghost/core` ← everyone. `ghost-fingerprint` ← `ghost-drift`, `ghost-fleet`. No cycles.

Each tool lives under `packages/<tool>/` with the same shape:

- `src/bin.ts` — shebang entry
- `src/cli.ts` — `buildCli()` builder (cac)
- `src/core/` — deterministic library surface, public via `src/core/index.ts`
- `src/skill-bundle/` — `SKILL.md` + `references/*.md` (only tools that ship recipes)
- `test/` — vitest, with `test/fixtures/` for sample data

## Packages

| Package | Published? | Description |
|---------|-----------|-------------|
| `packages/ghost-core` | ❌ private (`@ghost/core`) | Workspace-only library. Embedding math, shared types, target resolution, skill-bundle loader, `ghost.map/v2` schema, `ghost.survey/v2` schema + lint/merge/fix-ids primitives. No CLI. Consumed by every other tool. |
| `packages/ghost-drift` | ✅ `ghost-drift` on npm (v0.2+) | Drift detection. CLI verbs: `compare`, `ack`, `track`, `diverge`, `emit skill`. Skill recipes: `compare.md`, `review.md`, `verify.md`, `remediate.md`. Old `lint`/`describe`/`emit review-command`/`emit context-bundle` stay registered as stub commands that point users to `ghost-fingerprint`. |
| `packages/ghost-fingerprint` | ✅ intended-public (`publishConfig.access: public`, currently v0.0.0) | Owns the three-stage scan pipeline (`map.md` → `survey.json` → `fingerprint.md`). CLI verbs: `lint` (auto-detects file kind), `verify-profile` (fingerprint-to-survey fidelity), `inventory`, `describe`, `diff`, `survey <op>` (merge / fix-ids), `emit` (kinds: `review-command`, `context-bundle`, `skill`). Skill recipes: `map.md`, `survey.md`, `profile.md`, `schema.md`. |
| `packages/ghost-fleet` | ❌ private | Read-only elevation across many `(map.md, fingerprint.md)` members. CLI verbs: `members`, `view`, `emit skill`. Skill recipes: `target.md`. |
| `packages/ghost-ui` | ❌ private | Reference component library — 49 UI primitives + 48 AI elements + theme + hooks, distributed via the shadcn `registry.json`, not npm. Also ships the `ghost-mcp` bin (`src/mcp/`, built via `tsconfig.mcp.json` → `dist-mcp/`) — an MCP server re-exposing the registry to AI assistants (5 tools, 2 resources). |
| `apps/docs` | ❌ private | The deployed docs site (`ghost-docs`) — home, drift tooling docs, design language foundations, live component catalogue. Consumes `ghost-ui`. |

## CLI Commands

Verbs are scoped to the tool that owns the artifact. The full surface across all three tools:

| Tool | Command | Description |
|------|---------|-------------|
| `ghost-fingerprint` | `inventory [path]` | Emit raw repo signals (manifests, language histogram, registry, top-level tree, git remote) as JSON. Feeds the topology recipe. |
| `ghost-fingerprint` | `scan-status [dir]` | Report which scan stages have produced artifacts (`map.md` / `survey.json` / `fingerprint.md`) and which stage to run next. |
| `ghost-fingerprint` | `lint [file]` | Validate `fingerprint.md`, `map.md`, or `survey.json` — auto-detects the kind from path/content. |
| `ghost-fingerprint` | `verify-profile <fingerprint> <survey>` | Verify fingerprint-to-survey fidelity after profiling; palette values must be survey-backed and promoted checks must be calibrated. |
| `ghost-fingerprint` | `describe [fingerprint]` | Print section ranges + token estimates (so agents can selectively load). |
| `ghost-fingerprint` | `diff <a> <b>` | Structural prose-level diff between fingerprints (decisions + palette roles). **Not** vector distance. |
| `ghost-fingerprint` | `survey <op> [...surveys]` | Operate on `ghost.survey/v2` files. Ops: `merge` (concat with id-based dedup), `fix-ids` (recompute IDs from content). |
| `ghost-fingerprint` | `emit <kind>` | Derive an artifact from `fingerprint.md`: `review-command`, `context-bundle`, or `skill`. |
| `ghost-drift` | `compare [...fingerprints]` | Pairwise (N=2) or composite (N≥3) over fingerprint embeddings. `--semantic`, `--temporal`. |
| `ghost-drift` | `ack` | Record a stance toward the tracked fingerprint in `.ghost-sync.json`. |
| `ghost-drift` | `track <fingerprint>` | Shift the tracked fingerprint. |
| `ghost-drift` | `diverge <dimension>` | Declare intentional divergence on a dimension. |
| `ghost-drift` | `emit skill` | Install the `ghost-drift` agentskills.io bundle. |
| `ghost-fleet` | `members [dir]` | List registered fleet members + freshness. |
| `ghost-fleet` | `view [dir]` | Compute pairwise distances + group-by tables; emit `fleet.md` + `fleet.json`. |
| `ghost-fleet` | `emit skill` | Install the `ghost-fleet` agentskills.io bundle. |

**Workflows (agent recipes).** Each tool ships its own skill-bundle references under `packages/<tool>/src/skill-bundle/references/`. These are the agent's job, not CLI verbs:

- **Scan** (orchestrate map → survey → profile end-to-end) — `ghost-fingerprint/.../scan.md`
- **Map** (write `map.md` from a repo, the topology stage) — `ghost-fingerprint/.../map.md`
- **Survey** (write `survey.json` from a target, the observed evidence stage) — `ghost-fingerprint/.../survey.md`
- **Profile** (interpret a `survey.json` into `fingerprint.md`, the fingerprint stage) — `ghost-fingerprint/.../profile.md`
- **Review** (flag drift in PR changes) — `ghost-drift/.../review.md`
- **Verify** (generate → review loop) — `ghost-drift/.../verify.md`
- **Compare interpretation** — `ghost-drift/.../compare.md`
- **Remediate** (suggest minimal fixes for drift) — `ghost-drift/.../remediate.md`
- **Fleet narrative** (synthesize `fleet.md` prose from CLI output) — `ghost-fleet/.../target.md`

## Target Types

The `resolveTarget()` function in `@ghost/core` (`packages/ghost-core/src/target-resolver.ts`) accepts:

- `github:owner/repo` — GitHub repository
- `npm:package-name` — npm package
- `figma:file-url` — Figma file
- `./path` or `/absolute/path` — local directory
- `https://...` — URL
- `.` — current directory

Used by `resolveTrackedFingerprint` (in `ghost-drift`) and legacy library consumers. Profile and map flows don't consume targets directly — the host agent explores whatever directory is relevant.

## Canonical artifacts

Three artifacts produced in sequence by a scan, all owned by `ghost-fingerprint`:

- **`map.md`** — the topology card (stage 1). Human-readable answer to "where is the design system, which folders matter, and where are implemented surfaces observable?" Schema is `ghost.map/v2` (lives in `@ghost/core`), validated by `ghost-fingerprint lint map.md`. Authored from `ghost-fingerprint inventory` + the `map.md` skill recipe. The repo's own `map.md` lives at the root.
- **`survey.json`** — the observed evidence scan (stage 2). Catalogues every concrete design value (colors, spacings, typography, radii, shadows, breakpoints, motion, layout primitives) plus tokens, components, and implemented UI surfaces observed in the target. Each row carries occurrence counts and a deterministic content-hashed `id`. Schema is `ghost.survey/v2` (lives in `@ghost/core`); four sections — `values`, `tokens`, `components`, `ui_surfaces`. External libraries (icons, primitives, charting) deliberately *do not* have a survey section — whether a system uses Radix or hand-rolls primitives doesn't change what its design language *is*; load-bearing library choices surface as prose evidence in the interpreter stage. Validated by `ghost-fingerprint lint survey.json`. Authored via the `survey.md` skill recipe.
- **`fingerprint.md`** — the design language (stage 3, terminal). Human-readable, LLM-editable, with YAML frontmatter (machine layer: references + 49-dim embedding + palette/spacing/typography/surfaces/checks) and a three-section prose body (Character → Signature → Decisions). Authored by interpreting `survey.json` per the `profile.md` skill recipe. See `docs/fingerprint-format.md` for the full spec; the condensed reference ships at `packages/ghost-fingerprint/src/skill-bundle/references/schema.md`.

## Releasing & Changesets

`ghost-drift` is the only currently-published package. `ghost-fingerprint` is set up to publish (`publishConfig.access: public`); `ghost-fleet` is private workspace-only for now. Releases go through [Changesets](https://github.com/changesets/changesets); the `.github/workflows/release.yml` workflow opens a "Version Packages" PR whenever pending changesets are on `main`, and publishes to npm when that PR merges.

The Changesets config ignores private packages (`@ghost/core`, `ghost-fleet`, `ghost-ui`, `apps/docs`) — they don't appear in version PRs.

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
"ghost-fingerprint": minor
---
```

Guidance on the bump level:

- **`patch`** — bug fixes, doc fixes, non-breaking internal refactors. The default; when in doubt, pick this.
- **`minor`** — new CLI verb, new flag, new library export, new capability. Anything a user might want to reach for.
- **`major`** — removed/renamed CLI verb, removed/renamed library export, changed default behavior, breaking fingerprint schema change, changed exit codes. **Always flag this explicitly in the PR description and ask the user to confirm — do not `major`-bump unreviewed.**

Skip the changeset entirely for: CI/workflow-only changes, test-only changes, changes scoped to private packages.

The slug should be short and descriptive: `add-temporal-flag.md`, `fix-palette-lint-crash.md`. Avoid dates or PR numbers — Changesets consumes and deletes the file at version time.

## Key Conventions

- Each `fingerprint.md` carries a 49-dimensional embedding vector (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]; see `packages/ghost-core/src/embedding/embedding.ts`). The canonical on-disk form is the Markdown file itself — there is no parallel JSON/DTCG representation.
- `ghost-drift compare` takes **file paths** to `fingerprint.md`, not target strings. Mode auto-detects from N and flags: `--semantic` / `--temporal` require N=2; N≥3 returns a composite fingerprint.
- `ghost-drift ack` / `track` / `diverge` read the local `fingerprint.md`. The host agent is responsible for regenerating `fingerprint.md` (via the `profile` recipe) before acknowledging drift.
- `ghost-fingerprint lint` takes a single `fingerprint.md` and reports schema/partition violations. Use as the shape gate when authoring a fingerprint.
- `ghost-fingerprint verify-profile fingerprint.md survey.json --root .` is the required scan-stage fidelity gate after profiling: it checks palette provenance and promoted-check calibration against the survey/root.
- `ghost-fingerprint lint <map.md>` validates against `ghost.map/v2` (auto-detected by frontmatter or filename). Use as the success gate when authoring a map.
- The CLI manifest at `apps/docs/src/generated/cli-manifest.json` is auto-generated by `pnpm dump:cli-help`. CI guards drift via `pnpm check:cli-manifest`. Re-run `pnpm dump:cli-help` after adding/removing flags or verbs to any tool.
