---
name: review
description: Review PR or working-tree changes against checked-in Ghost memory.
handoffs:
  - label: Suggest minimal fixes
    skill: remediate
    prompt: Given the drift findings, suggest the minimal code changes that bring the diff back inside the .ghost fingerprint
---

# Recipe: Review Code Changes For Experience Drift

**Goal:** combine deterministic gates with advisory product-experience critique.

## Steps

### 1. Run The Gate

```bash
ghost check --base <ref>
```

Fix deterministic failures first. These come from active `checks.yml` rules in
checked-in memory and are the only blocking findings in v1. Use
`--package <dir>` or stack-aware options only when the user asks for advanced
routing.

### 2. Build Advisory Context

```bash
ghost review --base <ref>
```

Use the emitted packet as context. It includes:

- `fingerprint.yml` memory
- curated exemplars from `fingerprint.yml`
- active checks from `checks.yml`
- optional stack, config, intent, or accepted decision context when present or
  requested
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
- relevant exemplars when useful
- active check when blocking
- repair or intentional-divergence rationale

Good advisory topics:

- hierarchy mismatch
- density drift
- disclosure or recovery gap
- generic composition
- awkward action placement
- copy or trust-contract mismatch
- obligations grounded in fingerprint memory, human intent, accepted decisions,
  or active checks

Bad advisory topics:

- vague taste objections with no diff location
- restating fingerprint prose without applying it to the change
- enforcing a rule that is not in `checks.yml`
- unrelated audit categories not grounded in Ghost memory

When fingerprint memory is silent, local evidence can still support advisory
critique. Label those findings as provisional and non-Ghost-backed, and ground
them in nearby product surfaces, local components, token or copy conventions,
accepted decisions, or human intent. Ask the human before judging high-risk,
irreversible, privacy/security/legal, or product-identity-defining choices.

Memory changes are ordinary Git-reviewed edits to `fingerprint.yml`,
`checks.yml`, and optional rationale files when present. Do not silently rewrite
memory during a review unless the user asks to update memory.
