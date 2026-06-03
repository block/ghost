---
name: capture
description: Author repo-local Ghost product-experience memory.
handoffs:
  - label: Inspect memory status
    command: ghost scan
    prompt: What fingerprint memory is present and what is missing?
  - label: Run deterministic checks
    command: ghost check
    prompt: Run ghost check against this bundle
---

# Recipe: Capture A Ghost Fingerprint

**Goal:** record durable product-experience memory in `.ghost/fingerprint.yml`.
If a change is uncommitted or unmerged, it is draft work. If it is checked in,
Ghost treats it as canonical memory.

```text
.ghost/
  fingerprint.yml # canonical product-experience memory
  checks.yml      # optional deterministic gates
  cache/          # optional generated inventory
  intent.md       # optional human-authored context
  decisions/      # optional historical rationale
```

Generated inventory answers what exists right now. `fingerprint.yml` answers
what matters and why. Keep those layers separate: cache may be refreshed or
discarded, while fingerprint memory is edited deliberately and reviewed through
Git.

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
reference UI registry or library. This writes implementation routing into
`.ghost/config.yml` and records only implementation vocabulary in the blank
product fingerprint; it does not copy reference memory into product intent.

For a monorepo or deeply scoped product area, initialize local memory with
`ghost init --scope <path>`. Keep broad product identity in the root bundle and
put local situations, patterns, checks, decisions, and intent in the child.

### 2. Orient

Read the product, not just the component library. Look for surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal identity,
hierarchy, behavior, copy, accessibility, and trust.

Optional helper:

```bash
ghost inventory . > .ghost/cache/inventory.json
```

Treat cache output as scratch material. Do not copy raw inventory into
fingerprint memory without judgment.

### 3. Write Memory

Edit `fingerprint.yml` with the smallest useful durable memory:

- `summary`: product identity, audience, goals, anti-goals, tradeoffs, tone.
- `topology`: scopes, surface types, and representative examples.
- `situations`: user/task/state moments that change obligations.
- `principles`: durable product-experience truths.
- `experience_contracts`: behavior, disclosure, failure, recovery, and trust.
- `patterns`: visual, behavioral, content, and composition patterns.
- `implementation_vocabulary`: current tokens, components, libraries, assets,
  and notes that may help implement the product memory.

Prefer a few high-confidence entries over a comprehensive but noisy catalog.
Every entry should help a future agent make or review a product change.

### 4. Add Checks Sparingly

`checks.yml` is the executable appendix. Add only deterministic checks with a
typed `derives_from` reference into `fingerprint.yml`.

```yaml
derives_from: pattern:resource-index-stays-tabular
```

Keep speculative checks out of `checks.yml` until they have a deterministic
detector and evidence. Proposed checks may use `status: proposed` because check
enforcement still has its own lifecycle.

### 5. Validate

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost lint --all
ghost verify --all
ghost check --base HEAD
```

`lint` validates canonical shape, `verify` validates evidence paths and typed
check refs, and `check` runs only active deterministic gates.

## Gaps

If the repo does not yet contain enough product experience to capture, say so.
When memory is silent, continue from nearby product surfaces, local components,
token and copy conventions, accepted decisions or human intent, and ordinary UX
judgment when safe. Label that reasoning as provisional and non-Ghost-backed.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never treat generated inventory as canonical memory.
- Never invent product-experience obligations absent from evidence or human
  direction.
- Never promote subjective judgment directly into `checks.yml`; make it
  deterministic or keep it advisory.
