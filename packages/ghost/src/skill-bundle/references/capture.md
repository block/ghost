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

**Goal:** record durable product-experience memory in `.ghost/fingerprint/`.
If a change is uncommitted or unmerged, it is draft work. If it is checked in,
Ghost treats the fingerprint package as canonical.

```text
.ghost/
  config.yml
  fingerprint/
    manifest.yml
    prose.yml
    inventory.yml
    composition.yml
    enforcement/checks.yml
    memory/intent.md
    memory/decisions/
    sources/cache/
```

`prose.yml` answers what matters and why. `inventory.yml` records curated
materials, exemplars, and source links. `composition.yml` records how those
materials become recognizable experience. Checks validate output after
generation; they are not generation input.

## Steps

### 1. Initialize

```bash
ghost init
ghost scan
```

Use `--with-intent` only when you have human-authored or human-approved context
to preserve. Use `--with-config --reference <path-or-registry>` when local
routing or a reference UI registry/library should be recorded in `.ghost/config.yml`.

### 2. Orient

Read the product, not just the component library. Look for surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal identity,
hierarchy, behavior, copy, accessibility, and trust.

Optional helper:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory . > .ghost/fingerprint/sources/cache/inventory.json
```

Treat generated cache as scratch material. Do not copy raw inventory into
`inventory.yml` without judgment.

### 3. Write Core Layers

Edit the smallest useful durable layer content:

- `prose.yml`: summary, situations, principles, and experience contracts.
- `inventory.yml`: topology, building blocks, exemplars, and `sources[]` links.
- `composition.yml`: rules, layouts, structures, flows, states, content,
  behavior, and visual arrangements.

Prefer a few high-confidence entries over a comprehensive but noisy catalog.

### 4. Add Checks Sparingly

`fingerprint/enforcement/checks.yml` is the executable appendix. Add only
deterministic checks with typed derivation refs:

```yaml
derivation:
  composition:
    - composition.pattern:resource-index-stays-tabular
```

Ref-backed checks are preferred. Missing or unresolved derivation refs lint as
warnings. Inventory can support a check, but inventory-only grounding is not
product judgment by itself.

### 5. Validate

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost check --base HEAD
```

Use `ghost lint --all` and `ghost verify --all` only when nested fingerprint
packages exist.

## Never

- Never describe any file outside `.ghost/fingerprint/` as canonical package input.
- Never treat generated cache as canonical inventory.
- Never invent product-experience obligations absent from evidence or human direction.
- Never promote subjective judgment directly into checks; make it deterministic or keep it advisory.
