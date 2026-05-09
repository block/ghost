---
name: review
description: Review PR or working-tree changes against the local Ghost fingerprint package.
handoffs:
  - label: Suggest minimal fixes
    skill: remediate
    prompt: Given the drift findings, suggest the minimal code changes that bring the diff back inside the fingerprint package
  - label: Accept the drift
    command: ghost-drift ack
    prompt: Acknowledge that the current profile no longer matches and record the drift
---

# Recipe: Review Code Changes For Design Drift

**Goal:** combine deterministic gates with advisory design critique.

## Steps

### 1. Run The Gate

```bash
ghost-drift check --base <ref>
```

Fix deterministic failures first. These come from active human-promoted
`checks.yml` rules and are the only blocking findings in v1.

### 2. Build Advisory Context

```bash
ghost-drift review --base <ref>
```

Use the emitted packet as context. It includes:

- `.ghost/fingerprint/profile.md`
- `.ghost/fingerprint/survey.json`
- `.ghost/fingerprint/checks.yml`
- the diff

### 3. Write Advisory Findings

Advisory findings are non-blocking unless tied to an active deterministic check.
Each finding must cite:

- diff location
- profile section
- survey evidence
- precedent/example
- repair

Good advisory topics:

- density drift
- hierarchy mismatch
- generic composition
- awkward action placement
- surface metaphor mismatch

Bad advisory topics:

- vague taste objections with no example
- restating profile prose without a diff location
- enforcing a rule that is not in `checks.yml`

### 4. Promote Durable Rules Later

If an advisory finding recurs and can be detected deterministically, propose a
new `ghost.checks/v1` entry. Do not add it to `checks.yml` unless a human
curator promotes it.
