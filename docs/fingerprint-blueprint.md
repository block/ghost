# Split Portable Fingerprint Blueprint

`fingerprint/` is the umbrella. The three files at its root are the model a
host agent should privilege first:

```text
.ghost/
  config.yml                    # local adapter/routing config, not portable memory
  fingerprint/
    manifest.yml                # package anchor
    prose.yml                   # core: product judgment
    inventory.yml               # core: curated material + source links
    composition.yml             # core: experience patterns

    enforcement/
      checks.yml                # deterministic assertions

    memory/
      intent.md                 # human-approved context
      decisions/                # rationale history

    sources/
      cache/                    # refreshable generated observations
```

## Why The Split Exists

The split keeps the product model readable. `prose.yml`, `inventory.yml`, and
`composition.yml` are the prominent core because they answer different
questions:

| File | Question | Canonical Role |
| --- | --- | --- |
| `prose.yml` | What matters, why, and for whom? | Product judgment. |
| `inventory.yml` | What materials and exemplars can an agent inspect or use? | Curated implementation material and source links. |
| `composition.yml` | How do materials become a recognizable experience? | Patterns, flows, rules, and arrangements. |

Ghost assembles these raw files into the existing internal
`ghost.fingerprint/v1` document for lint, verify, compare, check, review,
stack, and context-bundle flows. There is no canonical assembled
`.ghost/fingerprint.yml` package input in the new shape.

## The Package Anchor

`manifest.yml` makes a folder discoverable as a portable fingerprint package:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

Missing raw layer files normalize to empty layers, but `ghost init` creates all
three for ergonomics.

## Core Layers

`prose.yml` contains durable product judgment: summary, situations,
principles, and experience contracts. It should be human-readable and sparse
enough that a reviewer can tell what judgment is actually approved.

`inventory.yml` contains topology, building blocks, exemplars, and outward
source links. Inventory can point to generated cache without making the cache
canonical:

```yaml
sources:
  - id: generated-inventory
    kind: cache
    ref: sources/cache/inventory.json
    note: Refreshable observed repo facts.
```

Supported `kind` values are `cache`, `registry`, `file`, `url`, and `package`.
Inventory-only evidence can support a check or review finding, but it does not
establish product judgment alone.

`composition.yml` contains reusable patterns. A pattern may cite checks that
enforce it:

```yaml
patterns:
  - id: tokenized-ui-color
    kind: visual
    pattern: Product UI color uses semantic tokens instead of literals.
    check_refs: [check:no-hardcoded-ui-color]
```

## Supporting Files

`enforcement/checks.yml` exists because some product-experience rules can be
validated deterministically. Checks surround the three core layers: they cite
`prose.*`, `composition.pattern:*`, `inventory.exemplar:*`, and other typed
refs, then run against a diff. Missing derivation refs are warnings so teams can
author gates before every citation is fully curated.

`memory/intent.md` exists for human-authored or human-approved context that
cannot be safely inferred from code. It supplements prose; it does not replace
the core layer files.

`memory/decisions/` exists for accepted or rejected rationale. Decisions explain
why a product-experience choice was made, especially when the current shape is
not obvious from the code. Accepted decisions can enrich review packets; rejected
decisions are history, not canonical inputs.

`sources/cache/` exists for generated observations. Cache answers what exists.
It can refresh or inform `inventory.yml`, but it never counts as readiness and
can be regenerated or deleted without losing canonical fingerprint layers.

`.ghost/config.yml` stays outside `fingerprint/` because it is local adapter
and routing config: implementation roots, reference registries, or package
wiring. It is useful to the host/project but is not portable product memory.

## Grounding Rules

Checks and review should prefer typed refs:

- `prose.principle:<id>`
- `prose.situation:<id>`
- `prose.experience_contract:<id>`
- `composition.pattern:<id>`
- `inventory.exemplar:<id>`
- `check:<id>`

Ref-backed checks are preferred. Missing or unresolved derivation refs lint as
warnings, not errors. Inventory refs are supporting evidence; prose and
composition are the product-judgment anchors.

## Portability Boundary

The portable package is `.ghost/fingerprint/`. It can move with the product
memory to another host. `.ghost/config.yml` remains local to the repo/adapter.
Legacy `resources.yml`, `map.md`, `survey.json`, `patterns.yml`, and direct
`fingerprint.yml` files can still inform migration, but they are not canonical
package input for new Ghost work.
