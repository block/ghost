---
name: scan
description: Drive a full Ghost scan to produce .ghost/{resources.yml,map.md,survey.json,patterns.yml} plus optional checks.yml and intent.md.
handoffs:
  - label: Inspect stage status
    command: ghost scan
    prompt: What fingerprint bundle stage should I run next?
  - label: Run deterministic drift checks
    command: ghost check
    prompt: Run ghost check against this bundle
---

# Recipe: Scan A Target End-To-End

**Goal:** produce a complete root fingerprint bundle:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml
  intent.md        # optional
```

## Overview

```text
resources -> map -> survey -> patterns
```

- `resources.yml`: references that define the product.
- `map.md`: topology and routing.
- `survey.json`: observed factual evidence.
- `patterns.yml`: operational composition grammar backed by survey evidence.
- `checks.yml`: optional human-promoted deterministic gates.
- `intent.md`: optional human-authored or human-approved product intent.

## Steps

### 0. Initialize

```bash
ghost init
ghost scan
```

Use `--with-intent` only when you have human-authored or human-approved intent
to record.

### 1. Resources

Run when `scan` recommends `resources`.

Author `.ghost/resources.yml` from the target, any design-system repositories,
canonical screenshots, docs, resolver sources, and include/exclude boundaries.

### 2. Map

Run when `scan` recommends `map`.

Follow [map.md](map.md). Write `.ghost/map.md`, then validate:

```bash
ghost lint .ghost
```

### 3. Survey

Run when `scan` recommends `survey`.

Follow [survey.md](survey.md). Write `.ghost/survey.json`, then finalize and
validate:

```bash
ghost survey fix-ids .ghost/survey.json -o .ghost/survey.json
ghost lint .ghost
```

### 4. Patterns

Run when `scan` recommends `patterns`.

Follow [patterns.md](patterns.md). Start from the derived pattern draft:

```bash
ghost survey patterns .ghost/survey.json -o .ghost/patterns.yml
```

Curate names, anatomy, variants, anti-patterns, confidence, and evidence. Then:

```bash
ghost verify .ghost --root <target>
ghost lint .ghost
```

### Optional. Checks

First scans may leave `checks.yml` with `checks: []`. Candidate checks belong in
your response or scan notes until a human curator promotes them.

When checks are promoted, validate and smoke-test:

```bash
ghost lint .ghost
ghost check --base HEAD
```

## Resumability

Run `ghost scan` between stages. To force a stage rerun,
delete or replace that artifact and re-run status. Do not move forward from a
failed lint or verify result.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never invent values or composition observations absent from `survey.json`.
- Never promote subjective composition prose directly into `checks.yml`; make it
  deterministic or keep it advisory.
