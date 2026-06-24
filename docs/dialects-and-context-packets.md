---
title: Relay configs and context packets
description: How Ghost keeps product-surface semantics stable while allowing declared custom facets.
---

# Relay configs and context packets

Ghost is a product-surface context protocol, not a generic document collector.
The default OSS shape remains the flat `.ghost/` package:

```text
.ghost/
  manifest.yml
  intent.yml
  inventory.yml
  composition.yml
  validate.yml
```

That shape is built in. Other files can participate only when a repo declares
how those files project into Ghost semantics.

## Protocol boundary

Ghost stays opinionated about semantic lanes:

- `intent` for product posture and obligations.
- `inventory` for material, exemplars, and evidence.
- `composition` for flow, hierarchy, and patterns.
- `checks` for deterministic validation and review gates.
- `questions` for unresolved assumptions and human decisions.
- `provenance` for source grounding.

Storage shape is allowed to vary through explicit custom facet declarations.
Relay consumes the normalized context packet, not arbitrary project files.

## Relay Configs

A Relay config is a versioned declaration. The current low-level schema name is
`ghost.dialect/v1`, but users should think of it as a custom Relay config:

```yaml
schema: ghost.dialect/v1
id: acme.product-surface/v1
profile: ghost.product-surface/v1

facets:
  - id: product-questions
    path: product/questions.yml
    lane: questions
    capabilities:
      - prompt.disambiguation
      - human.escalation
    projection:
      items_path: questions
      id_path: id
      summary_path: question
```

Ghost discovers custom Relay configs in this order:

1. `ghost relay gather --dialect <file>`
2. `.ghost/dialect.yml`
3. the built-in default Ghost config

The default config is built in; existing `.ghost/` packages do not need a config
file.

## Facets

A facet is a declared source of context. It must declare a lane and
capabilities. A schema name alone is not enough because a schema can validate
shape without explaining how Relay should use the content.

Core lanes are fixed. Extension lanes must be namespaced with `extension:`,
such as `extension:brand_voice` or `extension:risk_model`. Shared Ghost
capabilities are fixed, and custom capabilities must be namespaced, such as
`acme.brand-guidance`.

## Deterministic projection

Projection is declared field extraction. It is deterministic and does not use an
LLM.

For example, given:

```yaml
questions:
  - id: refund-policy
    question: Should refunds require manager approval?
    blocks:
      - final copy
```

and:

```yaml
projection:
  items_path: questions
  id_path: id
  summary_path: question
  content_paths:
    - blocks
  max_chars: 4000
```

Ghost can emit a `questions` packet item with the original source path, id,
summary, and bounded content. The same input and declaration always produce the
same packet.

Projection initially targets:

- `questions`
- `provenance`
- `extension:*`

Canonical `intent`, `inventory`, `composition`, and `checks` continue to use
Ghost's existing schemas and parsers.

## Relay-Generated Stacks

Some repos may keep example stack files for testing or calibration. Those are
not an official Ghost input contract. In Ghost, resolved stacks should be a
Relay output: Relay should use the repo config, target, available facets, and
future resolver rules to explain what context was selected.

This MVP does not recursively scan unit roots or accept stack files as source of
truth. It only projects explicitly declared facet files into the packet.

## Context packets

Relay emits `ghost.context-packet/v1` inside the existing
`ghost.relay.gather/v2` JSON output. The packet records:

- target mode and requested capabilities;
- selected lane items;
- posture;
- suggested reads;
- omissions and gaps;
- selected and omitted trace entries;
- source provenance for every selected item.

Markdown Relay briefs remain compact. The packet is the stable agent-facing IR.

## Non-goals

- Ghost does not become a generic YAML collector.
- OSS Ghost does not ship proprietary ontology.
- Relay does not read arbitrary files without a custom facet declaration.
- Authored stack files are not the official source of truth for Ghost Relay.
- Existing `.ghost/` packages do not need migration.
- Projection does not summarize or interpret with an LLM.
- Visibility is deterministic filtering and trace metadata, not an access
  control boundary.
