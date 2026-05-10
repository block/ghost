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
```

`survey.json` is the evidence ledger. `patterns.yml` is the operational
composition grammar. `checks.yml` is the deterministic gate layer. `intent.md`
is optional human-authored or human-approved intent.

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

## Commands

```bash
ghost-fingerprint init-package --with-intent
ghost-fingerprint lint
ghost-fingerprint survey patterns .ghost/survey.json -o .ghost/patterns.yml
ghost-fingerprint verify --root .
ghost-drift check --base main
ghost-drift review --base main
ghost-drift compare .ghost ../other/.ghost
```

`ghost-fingerprint verify` validates cross-artifact fidelity: resources should
resolve, composition patterns must cite survey-backed evidence, and checks must
reference known pattern IDs when they use pattern metadata.
