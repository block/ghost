---
name: review
description: Review PR or working-tree changes against .ghost/fingerprint.yml.
handoffs:
  - label: Suggest minimal fixes
    skill: remediate
    prompt: Given the drift findings, suggest the minimal code changes that bring the diff back inside the .ghost fingerprint
  - label: Accept the drift
    command: ghost ack
    prompt: Acknowledge that the current fingerprint no longer matches and record the drift
---

# Recipe: Review Code Changes For Experience Drift

**Goal:** combine deterministic gates with advisory product-experience critique.

## Steps

### 1. Run The Gate

```bash
ghost check --base <ref>
```

Fix deterministic failures first. These come from active human-promoted
`checks.yml` rules and are the only blocking findings in v1.

### 2. Build Advisory Context

```bash
ghost review --base <ref>
```

Use the emitted packet as context. It includes:

- `.ghost/fingerprint.yml`
- optional `.ghost/checks.yml`
- open `.ghost/proposals/*.yml`
- optional accepted decisions when requested with `--include-memory`
- the diff

### 3. Write Advisory Findings

Advisory findings are non-blocking unless tied to an active deterministic check.
Classify each finding as one of:

- `fix`
- `intentional-divergence`
- `missing-memory`
- `experience-gap`
- `eval-uncertainty`

Each finding must cite:

- diff location
- `fingerprint.yml` memory
- active check when blocking
- open proposal when relevant
- repair or intentional-divergence rationale

Good advisory topics:

- hierarchy mismatch
- density drift
- disclosure or recovery gap
- generic composition
- awkward action placement
- copy or trust-contract mismatch
- accessibility or responsive obligation drift

Bad advisory topics:

- vague taste objections with no diff location
- restating fingerprint prose without applying it to the change
- enforcing a rule that is not in `checks.yml`

### 4. Propose Durable Memory Later

If a finding exposes missing or contradictory memory, write a proposal instead
of silently editing canonical truth. Use:

- `missing-memory`
- `intentional-divergence`
- `experience-gap`
- `check-candidate`

Humans promote durable memory into `fingerprint.yml` or `checks.yml`.
