---
name: scan
description: Drive a full Ghost scan to produce .ghost/fingerprint/{map.md,survey.json,profile.md,checks.yml}.
handoffs:
  - label: Inspect stage status
    command: ghost-fingerprint scan-status
    prompt: What fingerprint package stage should I run next?
  - label: Run deterministic drift checks
    command: ghost-drift check
    prompt: Run ghost-drift check against this package
---

# Recipe: Scan A Target End-To-End

**Goal:** produce a complete fingerprint package:

```text
.ghost/fingerprint/
  map.md
  survey.json
  profile.md
  checks.yml
```

You orchestrate stages. The CLI validates; it does not perform the interpretive
scan for you.

## Overview

```text
map -> survey -> profile -> checks
```

- `map.md`: topology and routing.
- `survey.json`: observed facts.
- `profile.md`: non-enforcing design-language prior.
- `checks.yml`: human-promoted deterministic gates.

## Steps

### 0. Initialize

```bash
ghost-fingerprint init-package
ghost-fingerprint scan-status
```

If the CLI is not available, create the directory and four files manually.

### 1. Map

Run when `scan-status` recommends `map`.

Follow [map.md](map.md). Write `.ghost/fingerprint/map.md`, then validate:

```bash
ghost-fingerprint lint .ghost/fingerprint
```

### 2. Survey

Run when `scan-status` recommends `survey`.

Follow [survey.md](survey.md). Write `.ghost/fingerprint/survey.json`, then
finalize and validate:

```bash
ghost-fingerprint survey fix-ids .ghost/fingerprint/survey.json -o .ghost/fingerprint/survey.json
ghost-fingerprint lint .ghost/fingerprint
```

### 3. Profile

Run when `scan-status` recommends `profile`.

Follow [profile.md](profile.md). Use these bounded evidence views:

```bash
ghost-fingerprint survey summarize .ghost/fingerprint/survey.json
ghost-fingerprint survey catalog .ghost/fingerprint/survey.json
ghost-fingerprint survey patterns .ghost/fingerprint/survey.json
```

Write `.ghost/fingerprint/profile.md`. Validate:

```bash
ghost-fingerprint verify-profile .ghost/fingerprint/profile.md .ghost/fingerprint/survey.json --root <target>
ghost-fingerprint lint .ghost/fingerprint
```

### 4. Checks

Run when `scan-status` recommends `checks`, or whenever a human promotes gates.

First scans may leave `checks.yml` with `checks: []`. Candidate checks belong in
your response or scan notes until a human curator promotes them.

When checks are promoted, validate and smoke-test:

```bash
ghost-fingerprint lint .ghost/fingerprint
ghost-drift check --base HEAD
```

## Resumability

Run `ghost-fingerprint scan-status` between stages. To force a stage rerun,
delete or replace that artifact and re-run status. Do not move forward from a
failed lint.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never invent values absent from `survey.json`.
- Never promote subjective prose directly into `checks.yml`; make it lintable or
  keep it advisory.
