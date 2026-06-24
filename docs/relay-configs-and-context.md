---
title: Relay configs and context
description: How Ghost Relay gathers structured context and lets repos add declared sources.
---

# Relay configs and context

`ghost relay gather` gives an agent a target-specific brief from the checked-in
Ghost package. JSON output also includes a structured Relay context so tools can
read the same selection without parsing markdown.

The default OSS shape remains the flat `.ghost/` package:

```text
.ghost/
  manifest.yml
  intent.yml
  inventory.yml
  composition.yml
  validate.yml
```

That shape is built in. A repo only needs a Relay config when it wants extra
project-owned context files, such as product questions, source references, or
brand guidance, to appear in Relay JSON.

## Relay Configs

A Relay config lives at `.ghost/relay.yml`, or can be passed explicitly:

```bash
ghost relay gather app/settings/page.tsx --config .ghost/relay.yml --format json
```

Minimal example:

```yaml
schema: ghost.relay-config/v1
id: acme.product-surface/v1

sources:
  - id: product-questions
    path: product/questions.yml
    section: questions
    items: questions
    summary: question
    include:
      - blocks
    max_chars: 4000
```

Each source says: read this file, take these items, summarize each item with
this field, and optionally include a small set of fields as bounded content.
Relay does not read arbitrary project files.

## Sections

Core sections are:

- `intent`
- `inventory`
- `composition`
- `checks`
- `questions`
- `sources`

Extra sections use `extra:<name>`, for example `extra:brand_voice`.

Canonical `intent`, `inventory`, `composition`, and `checks` continue to come
from the Ghost package schemas. Custom Relay sources initially project into
`questions`, `sources`, and `extra:*`.

## Relay Context

JSON output from `ghost relay gather --format json` includes:

```json
{
  "schema": "ghost.relay.gather/v2",
  "context": {
    "schema": "ghost.relay-context/v1"
  }
}
```

The Relay context records:

- target path and mode;
- selected section items;
- source files for selected items;
- suggested reads;
- skipped context;
- gaps and trace information.

Markdown briefs stay compact. Relay context is the stable tool-facing shape.

## Non-Goals

- Ghost does not become a generic YAML collector.
- OSS Ghost does not ship proprietary ontology.
- Relay does not read arbitrary files without a Relay config source.
- Existing `.ghost/` packages do not need migration.
- Relay does not summarize or interpret custom sources with an LLM.
- Visibility is deterministic filtering and trace metadata, not an access
  control boundary.
