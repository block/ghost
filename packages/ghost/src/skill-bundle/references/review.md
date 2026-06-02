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

When accepted fingerprint memory is silent, local evidence can still support
advisory critique. Label those findings as provisional and non-Ghost-backed, and
ground them in nearby product surfaces, local components, token or copy
conventions, accepted decisions, or human intent. Ask the human before judging
high-risk, irreversible, privacy/security/legal, or product-identity-defining
choices.

### 4. Apply The Proposal Threshold

Do not create proposals for every ambiguity. A proposal is warranted only when
the gap is durable enough to help a future agent generate or review work:

- repeated across a surface, pattern, or workflow
- high-impact for trust, safety, recovery, money, permissions, destructive
  actions, or user confidence
- explicitly stated by a human
- intentionally divergent from accepted memory
- likely to recur in future reviews
- blocking confident classification as `fix`, `intentional-divergence`, or
  `eval-uncertainty`

Do not propose for isolated implementation details, weak local context,
duplicates of open proposals, issues already fixable from accepted memory,
vague taste concerns, or generic code quality.

For memory-gap findings, include:

```text
Memory action: none | recommend-proposal | create-proposal
```

Default to `recommend-proposal`. Use `create-proposal` only when the user
explicitly asks to capture memory or when following `propose.md`. Candidate
proposal kinds:

- `missing-memory`
- `intentional-divergence`
- `experience-gap`
- `check-candidate`

Humans promote durable memory into `fingerprint.yml` or `checks.yml`.
