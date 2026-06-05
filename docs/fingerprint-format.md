# The Portable Fingerprint Package Format

A Ghost fingerprint is the checked-in, repo-local product-experience world
model. The canonical portable package lives under `.ghost/fingerprint/`:

```text
.ghost/
  config.yml                    # optional local routing; not portable memory
  fingerprint/
    manifest.yml                # ghost.fingerprint-package/v1 package anchor
    prose.yml                   # core: product judgment
    inventory.yml               # core: curated material and source links
    composition.yml             # core: experience patterns

    enforcement/
      checks.yml                # optional deterministic gates

    memory/
      intent.md                 # optional human-approved intent
      decisions/                # optional accepted/rejected rationale

    sources/
      cache/                    # optional refreshable generated observations
```

Git is the staging and approval boundary: uncommitted or unmerged edits are
draft work, and checked-in `fingerprint/` core files are canonical for Ghost.
`.ghost/config.yml` stays outside the portable package because it routes local
implementation roots and reference libraries rather than product memory.

`manifest.yml` is intentionally small:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

The raw layer files can be sparse. Missing files or sections normalize to empty
layers when Ghost assembles the internal `ghost.fingerprint/v1` document used
by checks, review packets, context bundles, compare, and stack merges.

## Core Layers

`prose.yml` explains what matters and why:

```yaml
summary:
  product: Example Docs
  audience: [contributors, maintainers]
  goals:
    - Preserve task-first documentation and product trust.
principles:
  - id: prose-before-cache
    principle: Prose explains what matters and why; generated cache only explains what exists.
experience_contracts:
  - id: review-cites-memory
    contract: Advisory review findings must cite the diff and relevant fingerprint refs.
```

`inventory.yml` points to curated material and optional source links:

```yaml
topology:
  scopes:
    - id: docs-site
      paths: [apps/docs]
      surface_types: [docs-home, reference-page]
  surface_types: [docs-home, reference-page]
building_blocks:
  tokens: [--color-bg, --color-fg]
  components: [Button, CodeBlock]
  files: [apps/docs/src/content/docs/cli-reference.mdx]
exemplars:
  - id: cli-reference-page
    path: apps/docs/src/content/docs/cli-reference.mdx
    title: CLI reference page
    surface_type: reference-page
    scope: docs-site
    refs: [composition.pattern:reference-before-decoration]
sources:
  - id: generated-inventory
    kind: cache
    ref: sources/cache/inventory.json
    note: Refreshable observed repo facts.
```

Supported `inventory.sources[].kind` values are `cache`, `registry`, `file`,
`url`, and `package`. Source links are provenance and orientation; they do not
make generated source material canonical by themselves.

`composition.yml` explains how product material becomes experience:

```yaml
patterns:
  - id: reference-before-decoration
    kind: structure
    pattern: Reference pages prioritize the working surface before visual flourish.
    check_refs: [check:no-hardcoded-brand-color]
```

Use layer-qualified refs:

- `prose.situation:<id>`
- `prose.principle:<id>`
- `prose.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `check:<id>`

## Enforcement

`fingerprint/enforcement/checks.yml` uses `ghost.checks/v1`. Checks are
deterministic validation, not generation input.

```yaml
schema: ghost.checks/v1
id: example-docs
checks:
  - id: no-hardcoded-brand-color
    title: Use semantic color tokens
    status: active
    severity: serious
    derivation:
      composition:
        - composition.pattern:reference-before-decoration
      inventory:
        - inventory.exemplar:cli-reference-page
    applies_to:
      scopes: [docs-site]
      paths: [apps/docs]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.92
      observed_count: 12
      examples:
        - apps/docs/src/styles/theme.css
    repair: Move repeatable colors into semantic tokens.
```

Ref-backed checks are preferred. Missing or unresolved derivation refs lint as
warnings, not errors. Inventory refs can support checks, but inventory-only
grounding does not establish product judgment alone. Composition patterns can
cite related checks via `check_refs`.

## Memory And Sources

`fingerprint/memory/intent.md` is optional human-authored or human-approved
intent: constraints, tradeoffs, audience notes, and known exceptions that
should not be inferred from code alone.

`fingerprint/memory/decisions/*.yml` stores accepted or rejected
product-experience rationale using `ghost.decision/v1`. `ghost review
--include-memory` reads accepted decisions.

`fingerprint/sources/cache/` is refreshable generated material. It can help an
agent update `inventory.yml`, but cache files never count as fingerprint
readiness by themselves.

Legacy `resources.yml`, `map.md`, `survey.json`, `patterns.yml`, and direct
`fingerprint.yml` files may appear in older repos or explicit legacy workflows.
They are not canonical package input for new Ghost work.

## Nested Packages

Large repos can add scoped packages below the root:

```text
.ghost/fingerprint/...
apps/checkout/.ghost/fingerprint/...
apps/checkout/review/page.tsx
```

For a path like `apps/checkout/review/page.tsx`, Ghost resolves each
`<memory-dir>/fingerprint/manifest.yml` from root to leaf. The merged stack is
broad-to-local: child entries with the same `id` replace parent entries, scalar
summary fields use the nearest child value, arrays merge with de-dupe, and
child-relative paths normalize to repo-root paths in reports.

Checks merge by `id`, so a child check with `status: disabled` suppresses an
inherited active check. Intent files concatenate with layer headings. Decisions
merge by `id` with child entries winning.

## Core Commands

```bash
ghost init
ghost scan --format json
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main --format json
ghost review --base main --include-memory
ghost emit review-command --path apps/checkout/review/page.tsx
ghost emit context-bundle
```

`ghost scan` reports readiness in the same three-layer vocabulary. Useful
`prose` means any non-empty summary field, situation, principle, or experience
contract. Useful `inventory` means topology scopes or surface types, curated
building blocks, or exemplars. Useful `composition` means at least one
composition pattern.

Use generated cache when observed repo facts are useful source material:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory > .ghost/fingerprint/sources/cache/inventory.json
```

Curate durable conclusions into `prose.yml`, `inventory.yml`, or
`composition.yml`.
