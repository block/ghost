---
name: review
description: Review PR or working-tree changes against resolved Ghost memory stacks.
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
`checks.yml` rules in the resolved memory stack and are the only blocking
findings in v1. Use `--package <dir>` only when the user asks for exact
single-bundle behavior.

### 2. Build Advisory Context

```bash
ghost review --base <ref>
```

Use the emitted packet as context. It includes:

- `stacks[]` for changed files when nested bundles apply
- merged `fingerprint.yml` memory
- merged checks
- open proposals
- optional accepted decisions when requested with `--include-memory`
- layer provenance
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
- obligations grounded in fingerprint memory, human intent, open proposals, or
  active checks

Bad advisory topics:

- vague taste objections with no diff location
- restating fingerprint prose without applying it to the change
- enforcing a rule that is not in `checks.yml`
- unrelated audit categories not grounded in Ghost memory

### 4. Propose Durable Memory Later

If a finding exposes missing or contradictory memory, write a proposal instead
of silently editing canonical truth. Use `ghost proposal create --path <path>`
so the proposal lands in the nearest applicable scoped bundle. Use:

- `missing-memory`
- `intentional-divergence`
- `experience-gap`
- `check-candidate`

Humans promote durable memory into `fingerprint.yml` or `checks.yml`.
