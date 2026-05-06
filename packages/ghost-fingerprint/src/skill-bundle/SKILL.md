---
name: ghost-fingerprint
description: Author and validate fingerprint.md. Use when the user wants to write or update a fingerprint.md, validate one, describe its structure, diff two of them, or emit derived artifacts (review-command, context-bundle, agent skill). Triggers on phrases like "profile this design language", "write fingerprint.md", "lint my fingerprint", "what does this fingerprint say", or whenever an `fingerprint.md` file is being authored.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-fingerprint
---

# Ghost Fingerprint — Authoring fingerprint.md

This skill helps you write a project's `fingerprint.md`: YAML frontmatter plus a Markdown body with Character, Signature, and Decisions. Use it to profile a project, validate the result, inspect its structure, diff two fingerprints, or emit derived artifacts. Drift comparison and stance recording live in the sibling `ghost-drift` skill.

You do the synthesis. The `ghost-fingerprint` CLI gives deterministic answers for parsing, schema validation, layout, profile verification, and structural diff.

**Two install paths, same recipes.** When the user installed via `curl … | sh` (the no-CLI v0 path) the `ghost-fingerprint` binary is *not* on PATH. The recipes degrade gracefully: every CLI-using step has a prose fallback you can execute via `Read` / `Glob` / `Bash` / `Grep`. Detect availability once, at the start of a workflow:

```sh
command -v ghost-fingerprint >/dev/null && echo "cli" || echo "prose"
```

When the CLI is present, prefer it. When it is not, follow the fallback steps in the recipes instead of stopping to ask the user to install anything.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost-fingerprint lint [file]` | Validate `fingerprint.md`, `map.md`, or `survey.json` shape (auto-detects by `.json` extension, `schema: ghost.map/v2` frontmatter, or filename). Use before declaring an artifact structurally valid. |
| `ghost-fingerprint verify-profile <fingerprint.md> <survey.json> [--root <dir>]` | Validate fingerprint-to-survey fidelity after profiling: palette, spacing, typography, radii, and shadow posture must be survey-backed, and promoted checks must be calibrated. Use after `lint fingerprint.md` in the profile/scan success gate. |
| `ghost-fingerprint inventory [path]` | Emit deterministic raw repo signals (manifests, language histogram, candidate config files, registry presence, top-level tree, git remote) as JSON. Feeds the topology recipe. |
| `ghost-fingerprint scan-status [dir]` | Report which scan stages have produced artifacts (`map.md`, `survey.json`, `fingerprint.md`) and which stage to run next. Use to decide what to do at the start of a scan or between stages. |
| `ghost-fingerprint describe [fingerprint.md]` | Print a section map (line ranges + token estimates) so you can selectively read only the sections you need instead of loading the whole file. Use before review/generate when the fingerprint is large. |
| `ghost-fingerprint diff <a.md> <b.md>` | Structural prose-level diff between two fingerprints — what decisions, palette roles, and tokens changed. **Not the same as `ghost-drift compare`** (which returns embedding distance). Use diff when you want to read what changed; use compare when you want a number. |
| `ghost-fingerprint survey <op> [...surveys]` | Operate on `ghost.survey/v2` files. `merge` — concat with id-based dedup. `fix-ids` — recompute every row's `id` from content. `summarize` — bounded profiling digest. `catalog` — compact value enum/spec view for exact frontmatter values. |
| `ghost-fingerprint emit <kind>` | Derive per-project artifacts from `fingerprint.md`. Kinds: `review-command` (Rams-style slash command), `context-bundle` (multi-file generation prompt), `skill` (this agentskills.io bundle). |

If you find yourself reaching for `ghost-fingerprint scan` / `ghost-fingerprint survey` / `ghost-fingerprint profile` — those are *your* workflows, not CLI commands. Follow the recipes below.

## Workflows (your job, not the CLI's)

A full scan of a target produces three artifacts in sequence: `map.md` (map the system) → `survey.json` (survey what exists) → `fingerprint.md` (express what it means). `map.md` and `survey.json` are scan artifacts; `fingerprint.md` is the generation and drift root.

When the user asks you to:

- "Scan my project" / "do a full scan" / "go end-to-end" → [references/scan.md](references/scan.md). The meta-recipe — orchestrates map → survey → profile. Use when the user wants the full pipeline, not a specific stage.
- "Map my repo" / "where does the design system live" / "write map.md" → [references/map.md](references/map.md). Pre-req: none. Output: validated `map.md`.
- "Survey my design language" / "scan values" / "extract design tokens" → [references/survey.md](references/survey.md). Pre-req: `map.md` exists. Output: validated `survey.json`.
- "Profile my design language" / "write fingerprint.md" / "interpret these values" → [references/profile.md](references/profile.md). Pre-req: `map.md` AND `survey.json` exist (run map + survey first). Output: validated `fingerprint.md`.
- "Diff these two fingerprints" → run `ghost-fingerprint diff <a> <b>`. For embedding distance use `ghost-drift compare`.
- "Lint my fingerprint" / "lint my survey" → run `ghost-fingerprint lint <file>`. Fix anything it reports.
- "Verify this profile" / "check fingerprint fidelity" → run `ghost-fingerprint verify-profile fingerprint.md survey.json --root <target>`. Fix errors before treating a first-pass profile as scan-complete.
- "Merge these surveys" / "compose a cohort survey" → run `ghost-fingerprint survey merge <surveys...>`.
- "Catalog this survey" / "show exact value enums" → run `ghost-fingerprint survey catalog survey.json [--kind <kind>]`.

For drift detection (compare under change, ack/track/diverge, review PR diffs against a fingerprint) install the `ghost-drift` skill.

## The fingerprint.md format

An `fingerprint.md` has:

- **YAML frontmatter:** `id`, `source`, `timestamp`, `references`, `observation.personality`, `observation.resembles`, `decisions[].dimension`, `checks[]`, `palette`, `spacing`, `typography`, `surfaces`.
- **Markdown body:** `# Character`, `# Signature`, `# Decisions` with `### <dimension>` rationale blocks ending in `**Evidence:**` bullets.

`decisions[].dimension` is an index. The body carries the actual rationale and evidence. `references` are local provenance and optional source material; the body should still make sense if another project cannot open those paths.

Everything authored lives in `fingerprint.md`. Do not author or load `embedding.md`, `# Fragments`, or implicit `decisions/*.md`; runtime comparison computes embeddings from the parsed fingerprint.

When profiling for generation, capture positive range as well as constraints. A restrained system should still say how it creates variety: editorial scale, shaped composition, semantic/data color, role-based elevation, functional motion, local font sourcing, a deliberate type ramp, or themeable tokens. Use `composition-patterns` when examples show article, tracker, comparison, card, or control-surface shapes.

Each field lives in exactly one layer — no duplication. Putting prose in frontmatter is a lint error. Full spec: [references/schema.md](references/schema.md). Starting template: [assets/fingerprint.template.md](assets/fingerprint.template.md).

## Always

- Use `fingerprint.md` as the canonical filename (no slug prefix, no dotfile).
- Resolve variable chains end-to-end. Follow `var(--primary) → --primary: var(--brand-500) → --brand-500: #0066cc` to the concrete value.
- Emit colors as hex in frontmatter. The CLI recomputes oklch when it needs it.
- Every `palette` entry should be cited in at least one decision's `evidence`, or dropped — uncited tokens are noise.
- Use `ghost-fingerprint survey summarize survey.json` for broad profiling context and `ghost-fingerprint survey catalog survey.json` for exact value enums/specs.
- Validate with `ghost-fingerprint lint` before declaring structural success; for a profiled fingerprint, also run `ghost-fingerprint verify-profile fingerprint.md survey.json --root <target>`.

## Never

- Never invent tokens. If you did not observe a value in the source, omit the field. A missing field is better than a fabricated one.
- Never use the W3C Design Tokens or Style Dictionary format. Ghost's `fingerprint.md` is the artifact.
- Never stop at the first variable indirection. Follow the chain.
- Never write prose into frontmatter or structural data into the body.
