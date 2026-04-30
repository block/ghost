---
name: scan
description: Drive a full three-stage scan of a target — topology, objective, subjective — to produce map.md + bucket.json + expression.md.
handoffs:
  - label: Compare against another expression
    command: ghost-drift compare
    prompt: Compare the expression.md I just wrote against another expression
  - label: Inspect what stage to run next
    command: ghost-expression scan-status
    prompt: What scan stage should I run next in this directory?
---

# Recipe: Scan a target end-to-end

**Goal:** drive a target through all three scan stages — topology → objective → subjective — and end with three valid artifacts in the scan directory: `map.md` + `bucket.json` + `expression.md`. This is the meta-recipe; each stage has its own deeper recipe (see [map.md](map.md), [survey.md](survey.md), [profile.md](profile.md)) that you dispatch into.

You don't run a single CLI verb here. You orchestrate stages, validate after each, and stop when `scan-status` reports complete.

## Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Stage 1     │ →  │  Stage 2     │ →  │  Stage 3         │
│  topology    │    │  objective   │    │  subjective      │
│  map.md      │    │  bucket.json │    │  expression.md   │
└──────────────┘    └──────────────┘    └──────────────────┘
   recipe:              recipe:              recipe:
   map.md               survey.md            profile.md
```

Each stage's output is the next stage's input. Stage 3 is terminal — it's what other ghost tools (drift, fleet) consume.

## Steps

### 1. Locate the scan directory

The scan directory is wherever the three artifacts will live. For a local repo, this is usually the repo root. For a fleet member managed centrally, the scan directory lives in the central repo (e.g. `<central>/fleet/members/<id>/`) and the *target* (the source repo being scanned) is a separate location.

Throughout this recipe, "scan dir" = where artifacts land; "target" = where source code lives. They may or may not be the same path.

### 2. Check status

**Preferred (CLI present):**

    ghost-expression scan-status [scan-dir]

Reports per-stage state (`present` / `missing`) and the recommended next stage. If every stage is `present`, you're done. Otherwise, dispatch to the recipe for the recommended stage.

Use `--format json` if you want to consume the result programmatically:

    ghost-expression scan-status . --format json

**Prose fallback (no CLI):**

Check three paths and report what's missing in this order:

1. `<scan-dir>/map.md` — if missing, recommended_next = `topology`. Stop checking.
2. `<scan-dir>/bucket.json` — if missing, recommended_next = `objective`. Stop checking.
3. `<scan-dir>/expression.md` — if missing, recommended_next = `subjective`. If present, recommended_next = `null` (scan complete).

Use `Read` (or `Bash: ls <scan-dir>`) to verify each file exists. The first missing artifact is the next stage to run.

### 3. Stage 1 — Topology (`map.md`)

Run when `scan-status` reports `topology: missing`.

Recipe: [map.md](map.md). The agent reads `ghost-expression inventory <target>` for raw signals + the recipe's guidance, then writes `map.md` to the scan directory and validates with `ghost-expression lint map.md`.

After validation, re-run `scan-status` and proceed.

### 4. Stage 2 — Objective (`bucket.json`)

Run when `scan-status` reports `topology: present` and `objective: missing`.

Recipe: [survey.md](survey.md). The agent reads `map.md` to recognize the dialect, runs LLM-driven extraction (its own greps/regexes), records rows with empty `id` fields, finalizes IDs with `ghost-expression bucket fix-ids bucket.json -o bucket.json`, then validates with `ghost-expression lint bucket.json`.

The survey is the longest stage and the one with the most discipline (exhaustiveness, saturation, cross-checking counts). Don't shortcut it — the interpreter downstream cannot fabricate values that aren't in the bucket, so missed values become missed expression fields permanently.

After validation, re-run `scan-status` and proceed.

### 5. Stage 3 — Subjective (`expression.md`)

Run when `scan-status` reports both prior stages `present` and `subjective: missing`.

Recipe: [profile.md](profile.md). The agent reads `map.md` (for repo-kind signals) and `bucket.json` (for ground truth) and writes `expression.md` purely as interpretation: names decisions, writes the prose body, fills frontmatter from bucket rows. Cannot invent values not in the bucket. Validates with `ghost-expression lint expression.md` and a self-distance sanity check (`ghost-drift compare expression.md expression.md` returns 0).

### 6. Confirm complete

Re-run `scan-status`. If `recommended_next` is `null`, the scan is done.

## Resumability

Each stage is resumable independently because `scan-status` checks artifact presence at the start. To force a stage rerun, delete its artifact and call `scan-status` again — the recommended_next will surface that stage. Same idiom orchestrators like design-world-model already use.

## When a stage fails

If a stage's lint fails, fix the issue in the recipe pass and re-validate. **Do not move to the next stage on a failed lint** — the next stage's recipe assumes a valid input. A malformed `map.md` poisons the survey; a malformed `bucket.json` poisons the interpretation.

If you cannot make a stage pass (e.g. the target genuinely has no design system), the recipe for that stage tells you what to do — usually: write a minimal valid artifact that surfaces the gap (e.g. `expression.md` with empty palette and a `# Character` note explaining the absence), so downstream tools see honest "no signal" rather than a hallucinated one.

## When the bucket should be merged across multiple targets

Modular targets (one repo with N feature modules profiled separately) and fleet cohorts (N members merged into a cohort bucket) both run the survey stage per unit, then call:

    ghost-expression bucket merge <buckets...> -o merged.json

Then run the interpreter recipe (Stage 3) against `merged.json` instead of a single-source bucket. The interpreter recipe handles merged buckets the same way as single-source ones — every row still has provenance via `source`, and the prose interpretation is grounded in counts that span sources. This composition lives in the orchestrator (`design-world-model`'s pipeline scripts), not in any ghost CLI verb.

## Always

- Run `scan-status` between stages. Don't assume; check.
- Validate after each stage. Lint passing is the success gate.
- Resolve token alias chains end-to-end in stage 2 (the bucket records the chain).
- Cite bucket rows as evidence in stage 3 decisions.

## Never

- Never skip a stage. The recipe semantics depend on each stage running in order.
- Never edit a downstream artifact (`expression.md`) to fix a missing value — go upstream and re-run the relevant stage.
- Never invent values absent from `bucket.json` when authoring `expression.md`. If a value is missing from the bucket, either re-run survey (it was missed) or accept the absence.
