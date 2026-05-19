# The Root Fingerprint Bundle Format

A Ghost fingerprint is a repo-local identity bundle rooted at `.ghost/`. It is
not a single prose file. The canonical on-disk shape is:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml
  intent.md        # optional
  decisions/       # optional ghost.decision/v1 product-experience rationale
  proposals/       # optional ghost.proposal/v1 candidate fingerprint updates
```

`survey.json` is the evidence ledger. `patterns.yml` is the operational
composition grammar. `checks.yml` is the deterministic gate layer. `intent.md`
is optional human-authored or human-approved intent. `decisions/` and
`proposals/` are optional product-experience context: accepted/rejected
rationale and candidate changes that may later be promoted into the
fingerprint.

## Package Artifacts

### `resources.yml`

`resources.yml` tells Ghost what references define the product: the primary
target, design-system references, canonical surfaces, screenshots, docs,
resolver/upstream sources, and include/exclude boundaries.

```yaml
schema: ghost.resources/v1
id: cash-ios
primary:
  target: .
  paths: [Code]
design_system:
  - id: arcade
    target: ../arcade-ios-package
    paths: [Sources]
surfaces:
  - id: lending
    locator: Code/Features/Lending
    paths: [Code/Features/Lending]
include: ["Code/**"]
exclude: ["**/Tests/**"]
```

### `map.md`

`map.md` is the topology layer. It tells Ghost where UI surfaces live, which
scopes own which paths, and how changed files should route to evidence and
checks. It still uses `ghost.map/v2` frontmatter plus a short topology body.

### `survey.json`

`survey.json` is factual observed evidence. It records values, tokens,
components, implemented UI surfaces, and factual per-surface composition
observations. It should not assign design meaning or declare intent.

Surface rows may include:

```json
{
  "composition": {
    "anatomy": ["shell", "compact-header", "filter-row", "table"],
    "primary_region": "table",
    "action_placement": ["row", "selection-toolbar"],
    "navigation_context": "persistent-shell",
    "responsive_behavior": ["mobile filters collapse above table"],
    "confidence": 0.82
  }
}
```

### `patterns.yml`

`patterns.yml` is the operational composition grammar derived from survey
evidence and curated by the agent/human loop. It names surface types and
composition patterns so generation and review have stable handles.

```yaml
schema: ghost.patterns/v1
id: cash-ios
surface_types:
  - id: resource-index
    preferred_patterns: [dense-resource-index]
    evidence:
      - surface_id: customers-index
composition_patterns:
  - id: dense-resource-index
    surface_types: [resource-index]
    frequency: 7
    confidence: 0.88
    anatomy:
      ordered: [shell, compact-header, filter-row, table]
      required: [filter-row, table]
      forbidden: [oversized-hero]
    traits:
      density: [compressed]
      dominant_components: [Table, SearchInput]
    evidence:
      - surface_id: customers-index
        locator: /customers
    advisory:
      - Resource-index surfaces should preserve the work surface before explanation.
```

### `checks.yml`

`checks.yml` remains deterministic-only in this version. It uses
`ghost.checks/v1`; checks may reference `surface_types` and `pattern_ids` as
metadata, but composition policy is advisory until a later detector layer
exists.

### `intent.md`

`intent.md` is optional. When present, it should contain human-authored or
human-approved product intent: tradeoffs to preserve, misleading observations,
and what the product refuses to become. AI may draft it, but it is not
authoritative until accepted by a human.

### `decisions/*.yml`

Accepted or rejected product-experience decisions use `ghost.decision/v1`.
These are rationale artifacts: they explain why a product-experience decision matters
and cite evidence, but they do not block CI.

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
  pattern_ids: [confirmation-before-commit]
evidence:
  - path: apps/checkout/review.tsx
    note: Review step exposes edit affordances before submit.
decided_at: "2026-05-17T00:00:00.000Z"
```

`ghost review --include-memory` reads only decisions with
`status: accepted`.

### `proposals/*.yml`

Candidate fingerprint updates use `ghost.proposal/v1`. They remain unresolved
proposals until a human promotes them into decisions, patterns, checks, or
intent.

```yaml
schema: ghost.proposal/v1
id: saved-payment-empty-state
status: open
kind: decision
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery over education.
rationale: The user is blocked from paying, not browsing product concepts.
scope:
  roles: [design, pm, qa]
  surface_types: [empty-state]
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: decisions
  summary: Promote into an accepted product-experience decision if repeated.
```

## Commands

```bash
ghost init --with-intent
ghost lint
ghost survey patterns .ghost/survey.json -o .ghost/patterns.yml
ghost verify --root .
ghost check --base main
ghost review --base main --include-memory
ghost compare .ghost ../other/.ghost
```

`ghost verify` validates cross-artifact fidelity: resources should
resolve, composition patterns must cite survey-backed evidence, and checks must
reference known pattern IDs when they use pattern metadata.
