# The Root Fingerprint Package Format

A Ghost fingerprint is the checked-in root of a repo-local product-experience
world model. The package is rooted at `.ghost/`, and the core on-disk shape is:

```text
.ghost/
  fingerprint.yml  # canonical prose, inventory, and composition
  checks.yml       # optional deterministic gates
```

Git is the staging and approval boundary: uncommitted or unmerged edits are
draft work, and checked-in `fingerprint.yml` is canonical for Ghost.
Ghost is not a lifecycle manager, proposal system, design-system generator,
design-system registry, or screenshot archive. It validates checked-in fingerprint layers
and runs checked-in gates.

`fingerprint.yml` may start with only:

```yaml
schema: ghost.fingerprint/v2
```

Ghost normalizes omitted layer sections internally to empty `prose`,
`inventory`, and `composition` buckets so checks, review packets, context
bundles, and stack merges see the full shape.

Optional material can sit beside the core files:

```text
.ghost/
  config.yml       # optional implementation roots and reference registries/libraries
  intent.md        # optional human-authored or human-approved intent
  decisions/       # optional ghost.decision/v1 rationale
  cache/           # optional generated cache and other ephemeral facts
```

`config.yml` routes implementation and reference registry/library context
without defining product intent. `checks.yml` is the executable appendix.
Generated cache is refreshable optional source material and may be deleted
without losing canonical prose, inventory, or composition.

Legacy `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` files may
still appear in older repos or as migration/source material. They are not
canonical Ghost input.

## Advanced: Nested Packages

Large repos can add scoped fingerprint packages below the root:

```text
.ghost/
apps/checkout/.ghost/
apps/checkout/review/page.tsx
```

For a path like `apps/checkout/review/page.tsx`, Ghost resolves every
`.ghost/fingerprint.yml` from the repo root down to the nearest child bundle.
The merged stack is broad-to-local:

1. Root fingerprint layers supply product-wide prose, inventory, composition,
   checks, decisions, and intent.
2. Child fingerprint layers add local product-area detail.
3. Entries with the same `id` are replaced by the nearest child entry.
4. Child-relative paths are normalized to repo-root paths in reports, routing,
   and emitted context.

`prose.summary.product` and other scalar summary fields use the nearest child
value. Summary arrays, topology surface types, inventory building block arrays,
inventory exemplars, and composition patterns merge parent-to-child with
de-dupe. Checks merge by `id`, so a child check with `status: disabled`
suppresses an inherited active check. `intent.md` files concatenate with layer
headings. Decisions merge by `id` with child entries winning.

## `fingerprint.yml`

`fingerprint.yml` uses `ghost.fingerprint/v2`. It is explicitly three-layered:

- `prose` explains what matters and why.
- `inventory` points to building blocks and precedents an agent can inspect or
  use, including exemplars.
- `composition` explains how those blocks become experience: patterns, rules,
  layouts, structures, flows, states, content, behavior, and visual
  arrangements.

```yaml
schema: ghost.fingerprint/v2
prose:
  summary:
    product: Example Docs
    audience:
      - contributors
      - maintainers
    goals:
      - Preserve task-first documentation and product trust.
    anti_goals:
      - Turn reference pages into marketing pages.
    tradeoffs:
      - Prefer concise durable prose over exhaustive inventory.
    tone:
      - plain
      - precise
  situations:
    - id: documenting-api
      title: Documenting an API or CLI command
      user_intent: Understand what the tool does and how to use it safely.
      product_obligation: Lead with the durable concept, then show commands and limits.
      patterns: [composition.pattern:reference-before-decoration]
  principles:
    - id: prose-before-cache
      principle: Prose explains what matters and why; generated cache only explains what exists.
  experience_contracts:
    - id: review-cites-memory
      contract: Advisory review findings must cite the diff and the relevant fingerprint refs.
inventory:
  topology:
    scopes:
      - id: docs-site
        paths: [apps/docs]
        surface_types: [docs-home, reference-page]
    surface_types: [docs-home, reference-page]
  building_blocks:
    tokens: [--color-bg, --color-fg]
    components: [Button, CodeBlock]
    libraries: [shiki]
    assets: [apps/docs/public]
    routes: [apps/docs/src/app]
    files: [apps/docs/src/content/docs/cli-reference.mdx]
    notes:
      - Use these as current implementation material, not as proof of product fit.
  exemplars:
    - id: cli-reference-page
      path: apps/docs/src/content/docs/cli-reference.mdx
      title: CLI reference page
      surface_type: reference-page
      scope: docs-site
      why: Shows how command docs stay inspectable before decorative framing.
      refs: [composition.pattern:reference-before-decoration]
composition:
  patterns:
    - id: reference-before-decoration
      kind: structure
      pattern: Reference pages prioritize the working surface before visual flourish.
```

Layer sections are optional on disk and default to empty when omitted:

| Section | Purpose |
| --- | --- |
| `prose.summary` | Product identity, audience, goals, anti-goals, tradeoffs, and tone. |
| `prose.situations` | User/task/state moments that change product obligations. |
| `prose.principles` | Durable product experience rules and judgment. |
| `prose.experience_contracts` | How surfaces and capabilities speak, disclose, fail, and recover. |
| `inventory.topology` | Repo scopes, paths, and surface types. |
| `inventory.building_blocks` | Current tokens, components, libraries, assets, routes, files, and notes available for implementation. |
| `inventory.exemplars` | Curated paths that show what good looks like for generation and review. |
| `composition.patterns` | Reusable rules, layouts, structures, flows, states, content, behavior, and visual patterns. |

Use layer-qualified refs:

- `prose.situation:<id>`
- `prose.principle:<id>`
- `prose.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `check:<id>`

Exemplars are inventory. Entry-level `evidence` remains proof or citation for a
fingerprint claim; exemplars are the concrete surfaces an agent should inspect.

## `checks.yml`

`checks.yml` uses `ghost.checks/v2`. Active checks are deterministic and must
declare `derivation` with at least one prose or composition ref. Inventory refs
can support a check, but inventory-only grounding is not enough for an active
gate. Proposed checks may have incomplete derivation and lint as warnings.

```yaml
schema: ghost.checks/v2
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

Checks keep `status: active | proposed | disabled` because enforcement still
needs state. Fingerprint entries do not have status fields.

## `intent.md`

`intent.md` is optional. When present, it should contain human-authored or
human-approved product intent: constraints, tradeoffs, audience notes, and
known exceptions that should not be inferred from code alone.

## `decisions/*.yml`

Accepted or rejected product-experience decisions use `ghost.decision/v1`.
These explain why a decision matters and cite evidence, but they do not block
CI.

```yaml
schema: ghost.decision/v1
id: checkout-reversibility
status: accepted
title: Reversibility before money movement
claim: Payment review must make reversibility visible before final submission.
rationale: Users need confidence before committing money movement.
scope:
  roles: [design, engineering, pm, qa]
  scopes: [checkout]
  surface_types: [payment-review]
evidence:
  - path: apps/checkout/review.tsx
    note: Review step exposes edit affordances before submit.
decided_at: "2026-05-17T00:00:00.000Z"
```

`ghost review --include-memory` reads only decisions with `status: accepted`.

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
composition pattern. Generated `.ghost/cache/inventory.json` never counts toward
canonical inventory readiness. A bundle is `fingerprint-ready` only when all
three layers have useful content; otherwise scan reports the single-layer,
partial, empty, missing, or invalid state directly.

Advanced scoped fingerprint-package and wrapper commands remain available:

```bash
ghost init --with-intent
ghost init --with-config --reference packages/ghost-ui/.ghost
ghost init --scope apps/checkout --with-intent
ghost init --scope apps/checkout --memory-dir .design/memory
ghost lint --all
ghost verify --all
ghost stack apps/checkout/review/page.tsx
```

When `--reference packages/ghost-ui/.ghost` is used, generated config points to
`registry:packages/ghost-ui/public/r/registry.json` and separately records
`packages/ghost-ui/.ghost/fingerprint.yml`. The registry is inventory; it is
not copied into the product's own prose or composition.

Use `ghost inventory > .ghost/cache/inventory.json` when observed repo facts are
useful source material. Make `.ghost/cache/` first when it does not exist.
Curate durable conclusions into `fingerprint.yml`.
