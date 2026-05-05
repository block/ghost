---
name: ghost-expression
description: Author and validate expression.md. Use when the user wants to write or update an expression.md, validate one, describe its structure, diff two of them, or emit derived artifacts (review-command, context-bundle, agent skill). Triggers on phrases like "profile this design language", "write expression.md", "lint my expression", "what does this expression say", or whenever an `expression.md` file is being authored.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-expression
---

# Ghost Expression — Authoring expression.md

This skill helps you write a project's `expression.md`: YAML frontmatter plus a Markdown body with Character, Signature, and Decisions. Use it to profile a project, validate the result, inspect its structure, diff two expressions, or emit derived artifacts. Drift comparison and stance recording live in the sibling `ghost-drift` skill.

You do the synthesis. The `ghost-expression` CLI gives deterministic answers for parsing, schema validation, layout, profile verification, and structural diff.

**Two install paths, same recipes.** When the user installed via `curl … | sh` (the no-CLI v0 path) the `ghost-expression` binary is *not* on PATH. The recipes degrade gracefully: every CLI-using step has a prose fallback you can execute via `Read` / `Glob` / `Bash` / `Grep`. Detect availability once, at the start of a workflow:

```sh
command -v ghost-expression >/dev/null && echo "cli" || echo "prose"
```

When the CLI is present, prefer it. When it is not, follow the fallback steps in the recipes instead of stopping to ask the user to install anything.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost-expression lint [file]` | Validate `expression.md`, `map.md`, or `survey.json` shape (auto-detects by `.json` extension, `schema: ghost.map/v2` frontmatter, or filename). Use before declaring an artifact structurally valid. |
| `ghost-expression verify-profile <expression.md> <survey.json> [--root <dir>]` | Validate expression-to-survey fidelity after profiling: palette, spacing, typography, radii, and shadow posture must be survey-backed, and promoted checks must be calibrated. Use after `lint expression.md` in the profile/scan success gate. |
| `ghost-expression inventory [path]` | Emit deterministic raw repo signals (manifests, language histogram, candidate config files, registry presence, top-level tree, git remote) as JSON. Feeds the topology recipe. |
| `ghost-expression scan-status [dir]` | Report which scan stages have produced artifacts (`map.md`, `survey.json`, `expression.md`) and which stage to run next. Use to decide what to do at the start of a scan or between stages. |
| `ghost-expression describe [expression.md]` | Print a section map (line ranges + token estimates) so you can selectively read only the sections you need instead of loading the whole file. Use before review/generate when the expression is large. |
| `ghost-expression diff <a.md> <b.md>` | Structural prose-level diff between two expressions — what decisions, palette roles, and tokens changed. **Not the same as `ghost-drift compare`** (which returns embedding distance). Use diff when you want to read what changed; use compare when you want a number. |
| `ghost-expression survey <op> [...surveys]` | Operate on `ghost.survey/v2` files. `merge` — concat with id-based dedup. `fix-ids` — recompute every row's `id` from content. `summarize` — bounded profiling digest. `catalog` — compact value enum/spec view for exact frontmatter values. |
| `ghost-expression emit <kind>` | Derive per-project artifacts from `expression.md`. Kinds: `review-command` (Rams-style slash command), `context-bundle` (multi-file generation prompt), `skill` (this agentskills.io bundle). |

If you find yourself reaching for `ghost-expression scan` / `ghost-expression survey` / `ghost-expression profile` — those are *your* workflows, not CLI commands. Follow the recipes below.

## Workflows (your job, not the CLI's)

A full scan of a target produces three artifacts in sequence: `map.md` (map the system) → `survey.json` (survey what exists) → `expression.md` (express what it means). `map.md` and `survey.json` are scan artifacts; `expression.md` is the generation and drift root.

When the user asks you to:

- "Scan my project" / "do a full scan" / "go end-to-end" → [references/scan.md](references/scan.md). The meta-recipe — orchestrates map → survey → profile. Use when the user wants the full pipeline, not a specific stage.
- "Map my repo" / "where does the design system live" / "write map.md" → [references/map.md](references/map.md). Pre-req: none. Output: validated `map.md`.
- "Survey my design language" / "scan values" / "extract design tokens" → [references/survey.md](references/survey.md). Pre-req: `map.md` exists. Output: validated `survey.json`.
- "Profile my design language" / "write expression.md" / "interpret these values" → [references/profile.md](references/profile.md). Pre-req: `map.md` AND `survey.json` exist (run map + survey first). Output: validated `expression.md`.
- "Diff these two expressions" → run `ghost-expression diff <a> <b>`. For embedding distance use `ghost-drift compare`.
- "Lint my expression" / "lint my survey" → run `ghost-expression lint <file>`. Fix anything it reports.
- "Verify this profile" / "check expression fidelity" → run `ghost-expression verify-profile expression.md survey.json --root <target>`. Fix errors before treating a first-pass profile as scan-complete.
- "Merge these surveys" / "compose a cohort survey" → run `ghost-expression survey merge <surveys...>`.
- "Catalog this survey" / "show exact value enums" → run `ghost-expression survey catalog survey.json [--kind <kind>]`.

For drift detection (compare under change, ack/track/diverge, review PR diffs against an expression) install the `ghost-drift` skill.

## The expression.md format

An `expression.md` has:

- **YAML frontmatter:** `id`, `source`, `timestamp`, `references`, `observation.personality`, `observation.resembles`, `decisions[].dimension`, `checks[]`, `palette`, `spacing`, `typography`, `surfaces`.
- **Markdown body:** `# Character`, `# Signature`, `# Decisions` with `### <dimension>` rationale blocks ending in `**Evidence:**` bullets.

`decisions[].dimension` is an index. The body carries the actual rationale and evidence. `references` are local provenance and optional source material; the body should still make sense if another project cannot open those paths.

Everything authored lives in `expression.md`. Do not author or load `embedding.md`, `# Fragments`, or implicit `decisions/*.md`; runtime comparison computes embeddings from the parsed expression.

When profiling for generation, capture positive range as well as constraints. A restrained system should still say how it creates variety: editorial scale, shaped composition, semantic/data color, role-based elevation, functional motion, local font sourcing, a deliberate type ramp, or themeable tokens. Use `composition-patterns` when examples show article, tracker, comparison, card, or control-surface shapes.

Each field lives in exactly one layer — no duplication. Putting prose in frontmatter is a lint error. Full spec: [references/schema.md](references/schema.md). Starting template: [assets/expression.template.md](assets/expression.template.md).

## Always

- Use `expression.md` as the canonical filename (no slug prefix, no dotfile).
- Resolve variable chains end-to-end. Follow `var(--primary) → --primary: var(--brand-500) → --brand-500: #0066cc` to the concrete value.
- Emit colors as hex in frontmatter. The CLI recomputes oklch when it needs it.
- Every `palette` entry should be cited in at least one decision's `evidence`, or dropped — uncited tokens are noise.
- Use `ghost-expression survey summarize survey.json` for broad profiling context and `ghost-expression survey catalog survey.json` for exact value enums/specs.
- Validate with `ghost-expression lint` before declaring structural success; for a profiled expression, also run `ghost-expression verify-profile expression.md survey.json --root <target>`.

## Never

- Never invent tokens. If you did not observe a value in the source, omit the field. A missing field is better than a fabricated one.
- Never use the W3C Design Tokens or Style Dictionary format. Ghost's `expression.md` is the artifact.
- Never stop at the first variable indirection. Follow the chain.
- Never write prose into frontmatter or structural data into the body.
