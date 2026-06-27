---
name: capture
description: Author repo-local Ghost fingerprints.
handoffs:
  - label: Inspect fingerprint facets
    command: ghost scan
    prompt: What fingerprint facets does this package contribute, and which facets are absent?
  - label: Run deterministic checks
    command: ghost check
    prompt: Run ghost check against this bundle
---

# Recipe: Author Ghost Fingerprint

**Goal:** record durable product-surface composition in `.ghost/`.
If a change is uncommitted or unmerged, it is draft work. If it is checked in,
Ghost treats the fingerprint package as canonical.

```text
.ghost/
  manifest.yml
  intent.yml
  inventory.yml
  composition.yml
  validate.yml
```

`intent.yml` captures the intent behind the surface. `inventory.yml` records
curated materials, exemplars, and source links. `composition.yml` records the
patterns that make the surface feel intentional. Checks validate output after
generation; they are not generation input.

## Steps

### 1. Classify The Authoring Scenario

Before initialization or edits, decide which authoring posture fits this repo.
Follow [authoring-scenarios.md](authoring-scenarios.md) when the user is setting
up or substantially revising a fingerprint.

Common starting points:

- Net new repos are mostly human-led because the repo has little evidence.
- Net new repos with a UI library combine human intent with library scans.
- Existing repos combine human intent with code, docs, route, story, and
  exemplar scans.
- Existing repos with mixed quality require curation before repeated patterns
  become canonical.
- Monorepos and product suites run one contract per package: surfaces (not
  nested packages) are how a single contract organizes locality.

Human intent anchors surface composition. Scans provide evidence. Agent
synthesis is draft work until a human curates it and ordinary Git review
accepts it.

If the user asks for `auto-draft`, keep this same boundary: the mode may create
starter edits, but it does not make scan output canonical.

### 2. Initialize

```bash
ghost init
ghost scan
```

Use `--reference <path-or-registry>` when a reference UI registry or library
should seed `inventory.yml`.

### 3. Auto-Draft Mode

Use this branch only when the user explicitly asks for auto-draft, such as:

```text
Set up the Ghost fingerprint for this repo with auto-draft.
```

Auto-draft is a skill workflow, not a Ghost CLI action or flag.

1. If `.ghost/manifest.yml` is missing, run `ghost init`.
2. Run `ghost scan --format json`.
3. Gather raw repo signals:

   ```bash
   ghost signals .
   ```

4. Inspect high-signal files from the signals, plus routes, docs, stories,
   tests, tokens, registries, assets, screenshots, and exemplars.
5. Write only the smallest evidence-backed starter entries into
   `intent.yml`, `inventory.yml`, and `composition.yml`.
6. Ask the human to keep, soften, reject, scope, record, or convert important
   claims before treating them as durable fingerprint guidance.

If evidence is thin, contradictory, or mostly implementation plumbing, write
less and ask more. Do not fill facets with speculative product claims.

### 4. Orient

Read the product, not just the component library. Look for surfaces, docs,
tests, stories, routes, screenshots, or examples that reveal hierarchy,
behavior, copy, accessibility, trust, and flow.

Optional helper:

```bash
ghost signals .
```

Treat signals as scratch observations. Do not copy raw signals into
`inventory.yml` without curation.

### 5. Write Sparse Facets

Edit the smallest useful durable facet content:

- Before writing, ask whether the draft will help future agents choose what
  matters most, avoid plausible-but-wrong defaults, resolve competing
  priorities, route guidance by situation, inspect concrete exemplars, and
  review whether generated work preserved the intended experience.
- `intent.yml`: summary, situations, principles, and experience contracts.
- `inventory.yml`: building blocks, exemplars, and `sources[]` links.
- `composition.yml`: rules, layouts, structures, flows, states, content,
  behavior, and visual arrangements.

Prefer a few high-confidence entries over a comprehensive but noisy catalog.
Ask the human to keep, soften, reject, scope, or record important claims before
treating draft content as durable fingerprint guidance.

### 6. Add Checks Sparingly

`validate.yml` is the executable appendix. Add only
deterministic checks with typed derivation refs:

```yaml
derivation:
  composition:
    - composition.pattern:resource-index-stays-tabular
```

Ref-backed checks are preferred. Missing or unresolved derivation refs lint as
warnings. Inventory can support a check, but inventory-only grounding is not
surface-composition guidance by itself.

### 7. Validate

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost check --base HEAD
```

## Never

- Never describe any file outside `.ghost/` as canonical package input.
- Never treat raw `ghost signals` output as canonical inventory.
- Never treat auto-draft as a CLI feature or a replacement for human curation.
- Never invent surface-composition obligations absent from evidence or human direction.
- Never promote subjective taste directly into checks; make it deterministic or keep it advisory.
