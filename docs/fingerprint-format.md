# The Root Fingerprint Bundle Format

A Ghost fingerprint is a repo-local product experience memory bundle rooted at
`.ghost/`. The core on-disk shape is:

```text
.ghost/
  fingerprint.yml  # canonical product experience memory
  checks.yml       # optional deterministic gates
```

Git is the staging and approval boundary: uncommitted or unmerged edits are
draft work, and checked-in `fingerprint.yml` memory is canonical for Ghost.
Ghost is not a lifecycle manager, proposal system, design-system registry, or
screenshot archive. It validates checked-in memory and runs checked-in gates.

`fingerprint.yml` may start with only:

```yaml
schema: ghost.fingerprint/v1
```

Add only top-level sections that contain real memory. Ghost normalizes omitted
sections internally to empty `summary`, `topology`, memory arrays, `exemplars`, and
`implementation_vocabulary` so existing checks, review packets, and stack
merges still see the full shape.

Optional material can sit beside the core files:

```text
.ghost/
  config.yml       # optional implementation roots and reference registries/libraries
  intent.md        # optional human-authored or human-approved intent
  decisions/       # optional ghost.decision/v1 rationale
  cache/           # optional generated inventory and other ephemeral facts
```

`config.yml` routes implementation and reference registry/library context
without defining product intent. `checks.yml` is the executable appendix. Cache
is refreshable and may be deleted without losing canonical memory.

Legacy `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` files may
still appear in older repos or as migration/source material. They are not
canonical Ghost memory.

## Advanced: Nested Bundles

Large repos can add scoped bundles below the root:

```text
.ghost/
apps/checkout/.ghost/
apps/checkout/review/page.tsx
```

For a path like `apps/checkout/review/page.tsx`, Ghost resolves every
`.ghost/fingerprint.yml` from the repo root down to the nearest child bundle.
The merged stack is broad-to-local:

1. Root memory supplies product-wide identity, shared situations, principles,
   contracts, patterns, exemplars, checks, decisions, and intent.
2. Child memory adds local product-area detail.
3. Entries with the same `id` are replaced by the nearest child entry.
4. Child-relative paths are normalized to repo-root paths in reports, routing,
   and emitted context.

`summary.product` and other scalar summary fields use the nearest child value.
Summary arrays, topology surface types, exemplars, and implementation vocabulary merge
parent-to-child with de-dupe. Checks merge by `id`, so a child check with
`status: disabled` suppresses an inherited active check. `intent.md` files
concatenate with layer headings. Decisions merge by `id` with child entries
winning.

## `fingerprint.yml`

`fingerprint.yml` uses `ghost.fingerprint/v1`. It should stay compact enough
for agents to read before generation and review. Fingerprint entries do not
have lifecycle status fields; if an entry is in checked-in `fingerprint.yml`,
Ghost treats it as memory.

```yaml
schema: ghost.fingerprint/v1
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
    - Prefer concise durable memory over exhaustive inventory.
  tone:
    - plain
    - precise
topology:
  scopes:
    - id: docs-site
      paths: [apps/docs]
      surface_types: [docs-home, reference-page]
  surface_types: [docs-home, reference-page]
situations:
  - id: documenting-api
    title: Documenting an API or CLI command
    user_intent: Understand what the tool does and how to use it safely.
    product_obligation: Lead with the durable concept, then show commands and limits.
    patterns: [pattern:reference-before-decoration]
principles:
  - id: memory-before-inventory
    principle: Canonical memory should explain what matters and why; generated inventory only explains what exists.
experience_contracts:
  - id: review-cites-memory
    contract: Advisory review findings must cite the diff and the relevant fingerprint memory.
patterns:
  - id: reference-before-decoration
    kind: composition
    pattern: Reference pages prioritize the working surface before visual flourish.
exemplars:
  - id: cli-reference-page
    path: apps/docs/src/content/docs/cli-reference.mdx
    title: CLI reference page
    surface_type: reference-page
    scope: docs-site
    why: Shows how command docs stay inspectable before decorative framing.
    refs: [pattern:reference-before-decoration]
implementation_vocabulary:
  tokens: [--color-bg, --color-fg]
  components: [Button, CodeBlock]
  notes:
    - Use these as current implementation material, not as proof of product fit.
```

Top-level sections are optional on disk and default to empty when omitted:

| Section | Purpose |
| --- | --- |
| `summary` | Product identity, audience, goals, anti-goals, tradeoffs, and tone. |
| `topology` | Repo scopes, paths, and surface types. |
| `situations` | User/task/state moments that change product obligations. |
| `principles` | Durable product experience rules and judgment. |
| `experience_contracts` | How surfaces and capabilities speak, disclose, fail, and recover. |
| `patterns` | Reusable visual, behavioral, content, or composition patterns. |
| `exemplars` | Curated paths that show what good looks like for generation and review. |
| `implementation_vocabulary` | Current tokens, components, libraries, assets, and notes available for implementation. |

`exemplars` are canonical generation anchors when checked into
`fingerprint.yml`. Entry-level `evidence` remains proof or citation for a
memory claim; exemplars are the concrete surfaces an agent should inspect.

## `checks.yml`

`checks.yml` uses `ghost.checks/v1`. Active checks are deterministic and must
declare a typed `derives_from` reference into `fingerprint.yml`. Checks keep
`status: active | proposed | disabled` because enforcement still needs state.

```yaml
schema: ghost.checks/v1
id: example-docs
checks:
  - id: no-hardcoded-brand-color
    title: Use semantic color tokens
    status: active
    severity: serious
    derives_from: pattern:reference-before-decoration
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

Allowed grounding prefixes are `principle:*`, `situation:*`,
`experience_contract:*`, and `pattern:*`. Implementation vocabulary can help a
detector run, but it is not a grounding target.

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
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main --format json
ghost review --base main --include-memory
ghost emit review-command --path apps/checkout/review/page.tsx
ghost emit context-bundle
```

Advanced scoped-memory and wrapper commands remain available:

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
`packages/ghost-ui/.ghost/fingerprint.yml`. The registry is implementation
vocabulary; it is not copied into the product's own memory.

Use `ghost inventory > .ghost/cache/inventory.json` when observed repo facts are
useful source material. Create `.ghost/cache/` first when it does not exist.
Curate durable conclusions into `fingerprint.yml`.
