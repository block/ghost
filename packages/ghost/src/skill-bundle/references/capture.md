---
name: capture
description: Capture repo-local Ghost product-experience memory in .ghost/fingerprint.yml.
handoffs:
  - label: Inspect memory status
    command: ghost scan
    prompt: What fingerprint memory is present and what is missing?
  - label: Run deterministic checks
    command: ghost check
    prompt: Run ghost check against this bundle
---

# Recipe: Capture A Ghost Fingerprint

**Goal:** produce durable product-experience memory that helps agents build,
review, and repair on-brand work.

```text
.ghost/
  fingerprint.yml  # canonical product-experience memory
  checks.yml       # optional deterministic gates
  proposals/       # candidate memory changes
  cache/           # optional generated inventory
  intent.md        # optional human-approved context
```

`fingerprint.yml` answers what matters and why. Generated inventory answers
what exists right now. Keep those separate: inventory may be refreshed or
discarded, but canonical memory changes only through deliberate edits.

## Steps

### 1. Initialize

```bash
ghost init
ghost scan
```

Use `--with-intent` only when you have human-authored or human-approved context
to preserve. New projects may start with an empty but valid fingerprint and add
memory as product choices become real.

Use `--with-config --reference <path-or-registry>` when the product uses a
reference UI registry or library such as Ghost UI. This writes implementation
routing into `.ghost/config.yml` and records only implementation vocabulary in
the blank product fingerprint; it does not copy reference memory into product
intent.

### 2. Orient

Read the product, not just the component library. Look for the surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal identity,
hierarchy, behavior, copy, accessibility, and trust.

Optional helpers:

```bash
ghost inventory . > .ghost/cache/inventory.json
```

Treat cache output as scratch material. Do not promote raw inventory into
fingerprint memory without judgment.

### 3. Author `fingerprint.yml`

Fill the smallest useful memory:

- `summary`: product identity, audience, goals, anti-goals, tradeoffs, tone.
- `topology`: scopes, surface types, and representative examples.
- `situations`: user/task/state moments that change obligations.
- `principles`: durable product-experience truths.
- `experience_contracts`: behavior, disclosure, failure, recovery, and trust.
- `patterns`: visual, behavioral, content, and composition patterns.
- `implementation_vocabulary`: current tokens, components, libraries, assets,
  and notes that may help implement the product memory.
- `review_policy`: proposal and experience-gap handling.

Prefer a few high-confidence entries over a comprehensive but noisy catalog.
Every accepted entry should be useful to a future agent making or reviewing a
product change.

### 4. Add Checks Sparingly

`checks.yml` is the executable appendix. Add only deterministic checks with a
typed `derives_from` reference into `fingerprint.yml`.

```yaml
derives_from: pattern:resource-index-stays-tabular
```

Candidate checks belong in `.ghost/proposals/` as `kind: check-candidate` until
a human promotes them.

### 5. Validate

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost check --base HEAD
```

`lint` validates shape, `verify` validates evidence paths and typed check refs,
and `check` runs only active deterministic gates.

## Gaps

If the repo does not yet contain enough product experience to capture, say so.
For missing or contradictory memory, write a proposal with one of:

- `missing-memory`
- `intentional-divergence`
- `experience-gap`
- `check-candidate`

Humans promote durable truth. Agents do not silently rewrite canonical memory.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never treat generated inventory as canonical memory.
- Never invent product-experience obligations absent from evidence or human
  direction.
- Never promote subjective judgment directly into `checks.yml`; make it
  deterministic or keep it advisory.
