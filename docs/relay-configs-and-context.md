---
title: Relay configs and context
description: How Ghost Relay gathers structured context and lets repos add declared sources.
---

# Relay configs and context

`ghost relay gather` is the single command agents call to gather context. Relay
loads a Relay config, the config chooses the base runtime, and Ghost emits the
same `ghost.relay.gather/v2` JSON contract for agents. Markdown output remains a
compact human preview.

```text
ghost relay gather
-> load Relay config
-> choose base runtime
-> resolve target/request context
-> emit ghost.relay.gather/v2 JSON
```

The default OSS shape remains the flat `.ghost/` package:

```text
.ghost/
  manifest.yml
  intent.yml
  inventory.yml
  composition.yml
  validate.yml
```

That shape is the default runtime. A repo only needs a Relay config when it
wants extra project-owned context files, such as product questions, source
references, brand guidance, or declared request resolvers, to appear in Relay
JSON. Agent-framework repos can also provide a Relay config from another
location and opt out of a base fingerprint package.

## Relay Configs

A Relay config is loaded before Relay resolves context. Precedence is:

1. `--config <file>`
2. `GHOST_RELAY_CONFIG`
3. discovered `.ghost/relay.yml`
4. the built-in default config

OSS Ghost does not auto-discover framework-specific paths such as
`.agents/ghost/relay.yml`. Pass those paths explicitly or set
`GHOST_RELAY_CONFIG`.

```bash
ghost relay gather app/settings/page.tsx --config .ghost/relay.yml --format json
GHOST_RELAY_CONFIG=.agents/ghost/relay.yml ghost relay gather --request-stdin --format json
```

Source paths and resolver globs are relative to the repo root/current working
directory, not to the directory containing the config file.

Minimal fingerprint-based example:

```yaml
schema: ghost.relay-config/v1
id: acme.product-surface/v1

base:
  kind: fingerprint

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

Omitting `base` is the same as:

```yaml
base:
  kind: fingerprint
```

Each source says: read this file, take these items, summarize each item with
this field, and optionally include a small set of fields as bounded content.
Relay does not read arbitrary project files.

Request-only configs opt out of the base fingerprint runtime:

```yaml
schema: ghost.relay-config/v1
id: block.agent-context/v1

base:
  kind: none

sources: []

request_resolvers:
  - id: block-stacks
    kind: stack
    files:
      - stacks/*.yml
    schema: block.stack/v1
    unit_sources:
      - id: unit-questions
        path: "{unit}/questions.yml"
        section: questions
        items: questions
        summary: question
```

With `base.kind: none`, Relay does not load `.ghost/manifest.yml`. It resolves
only declared config sources and request resolvers:

```bash
ghost relay gather --request-stdin --config .agents/ghost/relay.yml --format json
ghost relay gather stacks/managerbot.cash-flow-gap.push.yml --config .agents/ghost/relay.yml --format json
```

The second form synthesizes a minimal Relay request with `task: gather` and the
target path, so a stack file can still be gathered through the same command.

## Relay Requests

Agents often start from a natural-language prompt rather than a file path. The
host adapter should turn that prompt into a small `ghost.relay-request/v1`
object, then ask Ghost to resolve it deterministically:

```bash
ghost relay gather --request request.yml --format json
ghost relay gather --request-stdin --format json
```

Example request:

```yaml
schema: ghost.relay-request/v1
task: generate-interface
prompt: Generate the right interface for a merchant cash-flow gap in push.
selectors:
  customer: merchant
  brand: square
  system: managerbot
  moment: cash-flow-gap
  medium: push
  capability: lending
constraints:
  output: interface
```

Ghost does not infer selectors from natural language. Codex, Claude, Goose, or
another host harness owns that extraction. Ghost receives selectors and resolves
declared context with exact/id-normalized matching.

Relay configs can declare stack-style request resolvers:

```yaml
schema: ghost.relay-config/v1
id: block.product-surface/v1

base:
  kind: fingerprint

sources: []

request_resolvers:
  - id: block-stacks
    kind: stack
    files:
      - stacks/*.yml
    schema: block.stack/v1
    unit_sources:
      - id: unit-questions
        path: "{unit}/questions.yml"
        section: questions
        items: questions
        summary: question
      - id: unit-sources
        path: "{unit}/sources.yml"
        section: sources
        items: sources
        summary: summary
      - id: unit-composition
        path: "{unit}/composition.yml"
        section: extra:composition
        items: patterns
        summary: pattern
```

A matching stack file can carry selector metadata:

```yaml
schema: block.stack/v1
id: managerbot.cash-flow-gap.push
title: Managerbot cash-flow gap via push
task_context:
  customer: merchant
  system: systems.managerbot
  moment: moments.merchant-cash-flow-gap
  medium: media.push
  capability: capabilities.lending
units:
  - systems/managerbot
  - media/push
  - capabilities/lending
```

When a request matches exactly one stack, Relay projects the declared unit
sources into `questions`, `sources`, and `extra:*`. Unit sources cannot project
into canonical `intent`, `inventory`, `composition`, or `checks`; those remain
owned by fingerprint packages unless projected as explicit extras. If selectors
are missing, conflicting, or ambiguous, Relay records gaps and trace entries
instead of guessing.

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

JSON output from `ghost relay gather --format json` is the stable agent-facing
contract:

```json
{
  "schema": "ghost.relay.gather/v2",
  "selected_context": {},
  "source": {},
  "targetPaths": [],
  "stackDirs": [],
  "brief": "# Ghost Relay Brief...",
  "context": {
    "schema": "ghost.relay-context/v1"
  }
}
```

The nested Relay context records:

- target path, request, and mode;
- Relay config id, source, path, and `base.kind`;
- selected section items;
- source files for selected items;
- suggested reads;
- skipped context;
- gaps and trace information.

Agents and host adapters should consume JSON fields such as `context`,
`selected_context`, `targetPaths`, `source`, `stackDirs`, gaps, and trace data.
The top-level `brief` field is preview text for display and compatibility; do
not scrape it as the primary agent interface. Plain markdown output may omit
projected Relay config sources that are present in JSON.

## Non-Goals

- Ghost does not become a generic YAML collector.
- OSS Ghost does not ship proprietary ontology.
- OSS Ghost does not auto-discover `.agents` paths; use `--config` or
  `GHOST_RELAY_CONFIG`.
- Relay does not read arbitrary files without a Relay config source.
- Relay does not infer selectors from natural-language prompts.
- Existing `.ghost/` packages do not need migration.
- Relay does not summarize or interpret custom sources with an LLM.
- Visibility is deterministic filtering and trace metadata, not an access
  control boundary.
