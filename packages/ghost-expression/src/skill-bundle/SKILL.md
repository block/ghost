---
name: ghost-expression
description: Author and validate expression.md — Ghost's canonical design-language artifact. Use when the user wants to write or update an expression.md, validate one, describe its structure, diff two of them, or emit derived artifacts (review-command, context-bundle, agent skill). Triggers on phrases like "profile this design language", "write expression.md", "lint my expression", "what does this expression say", or whenever an `expression.md` file is being authored.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-expression
---

# Ghost Expression — Authoring the Canonical Artifact

This skill helps you author the project's design language — its `expression.md` (YAML frontmatter + three-layer Markdown: Character → Signature → Decisions). You profile a project to write one, then validate, describe, diff, and emit derived artifacts. The **change** half (compare two expressions for drift, acknowledge it, track another expression as your reference) lives in the sibling `ghost-drift` skill.

You do the synthesis (the profile recipe). The `ghost-expression` CLI is the calculator you reach for when you need a reproducible answer: parsing, schema validation, layout, structural diff. Call it freely; the output is ground truth.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost-expression lint [file]` | Validate `expression.md`, `map.md`, or `bucket.json` (auto-detects by `.json` extension, `schema: ghost.map/v1` frontmatter, or filename). Use before declaring an artifact valid. |
| `ghost-expression inventory [path]` | Emit deterministic raw repo signals (manifests, language histogram, candidate config files, registry presence, top-level tree, git remote) as JSON. Feeds the topology recipe. |
| `ghost-expression scan-status [dir]` | Report which scan stages have produced artifacts (`map.md`, `bucket.json`, `expression.md`) and which stage to run next. Use to decide what to do at the start of a scan or between stages. |
| `ghost-expression describe [expression.md]` | Print a section map (line ranges + token estimates) so you can selectively read only the sections you need instead of loading the whole file. Use before review/generate when the expression is large. |
| `ghost-expression diff <a.md> <b.md>` | Structural prose-level diff between two expressions — what decisions, palette roles, and tokens changed. **Not the same as `ghost-drift compare`** (which returns embedding distance). Use diff when you want to read what changed; use compare when you want a number. |
| `ghost-expression bucket <op> [...buckets]` | Operate on `ghost.bucket/v1` files. `merge` — concat with id-based dedup, deterministic and idempotent (useful for modular rollups and fleet cohort views). `fix-ids` — recompute every row's `id` from content (use after authoring rows with empty `id` fields). |
| `ghost-expression emit <kind>` | Derive per-project artifacts from `expression.md`. Kinds: `review-command` (Rams-style slash command), `context-bundle` (multi-file generation prompt), `skill` (this agentskills.io bundle). |

If you find yourself reaching for `ghost-expression scan` / `ghost-expression survey` / `ghost-expression profile` — those are *your* workflows, not CLI commands. Follow the recipes below.

## Workflows (your job, not the CLI's)

A full scan of a target produces three artifacts in sequence: `map.md` (topology) → `bucket.json` (objective values) → `expression.md` (subjective interpretation). Each stage feeds the next; each stage is its own recipe.

When the user asks you to:

- "Scan my project" / "do a full scan" / "go end-to-end" → [references/scan.md](references/scan.md). The meta-recipe — orchestrates topology → survey → profile. Use when the user wants the full pipeline, not a specific stage.
- "Map my repo" / "where does the design system live" / "write map.md" → [references/map.md](references/map.md). Pre-req: none. Output: validated `map.md`.
- "Survey my design language" / "scan values" / "extract design tokens" → [references/survey.md](references/survey.md). Pre-req: `map.md` exists. Output: validated `bucket.json`.
- "Profile my design language" / "write expression.md" / "interpret these values" → [references/profile.md](references/profile.md). Pre-req: `map.md` AND `bucket.json` exist (run topology + survey first). Output: validated `expression.md`.
- "Diff these two expressions" → run `ghost-expression diff <a> <b>`. For embedding distance use `ghost-drift compare`.
- "Lint my expression" / "lint my bucket" → run `ghost-expression lint <file>`. Fix anything it reports.
- "Merge these buckets" / "compose a cohort bucket" → run `ghost-expression bucket merge <buckets...>`.

For drift detection (compare under change, ack/track/diverge, review PR diffs against an expression) install the `ghost-drift` skill.

## The expression.md format

An `expression.md` has:

- **YAML frontmatter (machine layer):** `id`, `source`, `timestamp`, `observation.personality`, `observation.resembles`, `decisions[].dimension`/`.evidence`, `palette`, `spacing`, `typography`, `surfaces`.
- **Markdown body (prose layer):** `# Character` (`observation.summary`), `# Signature` (bullets from `distinctiveTraits`), `# Decisions` with `### <dimension>` rationale blocks.

Each field lives in exactly one layer — no duplication. Putting prose in frontmatter is a lint error. Full spec: [references/schema.md](references/schema.md). Starting template: [assets/expression.template.md](assets/expression.template.md).

## Always

- Use `expression.md` as the canonical filename (no slug prefix, no dotfile).
- Resolve variable chains end-to-end. Follow `var(--primary) → --primary: var(--brand-500) → --brand-500: #0066cc` to the concrete value.
- Emit colors as hex in frontmatter. The CLI recomputes oklch when it needs it.
- Every `palette` entry should be cited in at least one decision's `evidence`, or dropped — uncited tokens are noise.
- Validate with `ghost-expression lint` before declaring success.

## Never

- Never invent tokens. If you did not observe a value in the source, omit the field. A missing field is better than a fabricated one.
- Never use the W3C Design Tokens or Style Dictionary format. Ghost's `expression.md` is the artifact.
- Never stop at the first variable indirection. Follow the chain.
- Never write prose into frontmatter or structural data into the body — the partition is load-bearing.
