---
name: capture
description: Author repo-local Ghost fingerprints.
handoffs:
  - label: Inspect fingerprint layers
    command: ghost scan
    prompt: What fingerprint layers are present and what is missing?
  - label: Run deterministic checks
    command: ghost check
    prompt: Run ghost check against this bundle
---

# Recipe: Author Ghost Fingerprint

**Goal:** record durable product-experience memory in `.ghost/fingerprint.yml`.
If a change is uncommitted or unmerged, it is draft work. If it is checked in,
Ghost treats the fingerprint as canonical.

```text
.ghost/
  fingerprint.yml # canonical prose, inventory, and composition
  checks.yml      # optional deterministic gates
```

`fingerprint.yml` answers what matters and why. `checks.yml` contains only
optional active gates. Git is the approval boundary; Ghost does not manage a
separate fingerprint lifecycle.

Generation uses prose, inventory, and composition. Checks validate output after
generation; they are not generation input.

`fingerprint.yml` may start sparse:

```yaml
schema: ghost.fingerprint/v2
```

Add only sections that contain real layer content. Ghost normalizes omitted layer
sections internally, so an empty project does not need placeholder arrays or
objects.

Optional files may appear beside the core files: `intent.md` for human-authored
context, `decisions/` for historical rationale, `config.yml` for implementation
routing, and `cache/` for generated cache.

## Steps

### 1. Initialize

```bash
ghost init
ghost scan
```

Use `--with-intent` only when you have human-authored or human-approved context
to preserve. New projects may start with an empty but valid fingerprint and add
layer content as product choices become real.

Use `--with-config --reference <path-or-registry>` when the product uses a
reference UI registry or library. This writes implementation routing into
`.ghost/config.yml` and records the library under
`inventory.building_blocks.libraries`; it does not copy reference fingerprints into
product prose or composition.

For a monorepo or deeply scoped product area, `ghost init --scope <path>` is an
advanced option. Keep broad product identity in the root package and put local
situations, patterns, and checks in the child only when scoped fingerprint layers are needed.

### 2. Orient

Read the product, not just the component library. Look for surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal identity,
hierarchy, behavior, copy, accessibility, and trust.

Optional helper:

```bash
mkdir -p .ghost/cache
ghost inventory . > .ghost/cache/inventory.json
```

Treat generated cache as scratch material. Do not copy raw inventory into
`fingerprint.yml` without judgment.

### 3. Write Fingerprint

Edit `fingerprint.yml` with the smallest useful durable layer content. Omit sections
until they have real entries:

- `prose.summary`: product identity, audience, goals, anti-goals, tradeoffs, tone.
- `prose.situations`: user/task/state moments that change obligations.
- `prose.principles`: durable product-experience truths.
- `prose.experience_contracts`: behavior, disclosure, failure, recovery, and trust.
- `inventory.topology`: scopes and surface types.
- `inventory.building_blocks`: current tokens, components, libraries, assets,
  routes, files, and notes that may help implement the selected prose and composition.
- `inventory.exemplars`: concrete surfaces that show what good looks like.
- `composition.patterns`: rules, layouts, structures, flows, states, content,
  behavior, and visual arrangements.

Prefer a few high-confidence entries over a comprehensive but noisy catalog.
Every entry should help a future agent make or review a product change.

### 4. Add Checks Sparingly

`checks.yml` is the executable appendix. Add only deterministic checks with a
typed `derivation` object that cites `fingerprint.yml`.

```yaml
derivation:
  composition:
    - composition.pattern:resource-index-stays-tabular
```

Active checks need at least one prose or composition grounding. Inventory can
support a check, but inventory-only grounding is not enough for an active gate.
Proposed checks may have incomplete derivation and should lint as warnings
while check enforcement still has its own lifecycle.

### 5. Validate

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost check --base HEAD
```

`lint` validates canonical shape, `verify` validates evidence paths and typed
check refs, and `check` runs only active deterministic gates.

Use `ghost lint --all` and `ghost verify --all` only when nested fingerprint packages
exist.

## Gaps

If the repo does not yet contain enough product experience to record, say so.
When fingerprint layers are silent, continue from nearby product surfaces, local components,
token and copy conventions, optional rationale files when present, and ordinary
UX judgment when safe. Label that reasoning as provisional and
non-Ghost-backed.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never treat generated cache as canonical inventory.
- Never invent product-experience obligations absent from evidence or human
  direction.
- Never promote subjective judgment directly into `checks.yml`; make it
  deterministic or keep it advisory.
