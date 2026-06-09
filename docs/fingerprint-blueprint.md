# Ghost Fingerprint Blueprint

A Ghost fingerprint is checked-in product-surface composition for a repo: a
portable contract humans can approve and agents can act from. It is the
material a host agent reads before generating UI and the deterministic
grounding Ghost uses after changes for lint, verify, check, review, compare,
and context-bundle flows.

The fingerprint is not a single prompt, screenshot archive, or generated design
system dump. It is a small portable package of curated YAML and optional human
context. Its job is to preserve surface composition: hierarchy, density,
restraint, trust, flow, accessibility, copy, repetition, and the choices that
make a surface feel intentional.

## The Portable Package

The canonical package lives at `.ghost/fingerprint/`:

```text
.ghost/
  config.yml                    # optional local routing; not portable context
  fingerprint/
    manifest.yml                # package anchor
    prose.yml                   # core: surface intent
    inventory.yml               # core: curated material and source links
    composition.yml             # core: experience patterns

    enforcement/
      checks.yml                # optional deterministic gates

    memory/
      intent.md                 # optional human-approved context
      decisions/                # optional accepted/rejected rationale

    sources/
      cache/                    # optional refreshable generated observations
```

The portable boundary is `.ghost/fingerprint/`. That folder can move with the
surface-composition context to another host or repo. `.ghost/config.yml` stays outside the
package because it stores local adapter details such as implementation roots,
reference registries, or host routing.

Git is the approval boundary. Uncommitted edits are draft work; checked-in core
layer files are the approved Ghost fingerprint.

## Package Anchor

`manifest.yml` makes a folder discoverable as a fingerprint package:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

`id` is a lowercase slug: alphanumeric plus `.`, `_`, or `-`, with an
alphanumeric first character. The manifest is intentionally tiny because the
package meaning lives in the layer files.

## Core Model

Ghost privileges three root layer files. Together they answer the questions an
agent needs before writing product UI:

| File | Question | Role |
| --- | --- | --- |
| `prose.yml` | What intent shapes the surface, and for whom? | Surface intent. |
| `inventory.yml` | What materials can an agent inspect or reuse? | Curated implementation material and source links. |
| `composition.yml` | Which patterns make the surface feel intentional? | Patterns, flows, rules, states, and arrangements. |

The layer files are raw YAML. Ghost assembles them internally into a
`ghost.fingerprint/v1` document:

```yaml
schema: ghost.fingerprint/v1
prose: {}
inventory: {}
composition: {}
```

Missing layer files or omitted sections normalize to empty layers. That lets a
new package start sparse, while commands and host packets still receive one
consistent assembled shape.

## `prose.yml`

`prose.yml` captures the intent behind the surface. It should be
human-readable, sparse, and durable enough that a reviewer can see what has
actually been approved.

```yaml
summary:
  product: Example Docs
  audience:
    - contributors
    - maintainers
  goals:
    - Keep documentation task-first and trustworthy.
  anti_goals:
    - Do not turn reference pages into marketing surfaces.
  tradeoffs:
    - Prefer scannability over dramatic editorial pacing.
  tone:
    - direct
    - calm

situations:
  - id: cli-reference-lookup
    title: CLI reference lookup
    user_intent: Find the exact command or flag needed for the current task.
    product_obligation: Keep command shape, options, and examples close together.
    surface_type: reference-page
    hierarchy:
      primary: command and flag names
      secondary: examples and caveats
    refuses:
      - decorative intros that delay the reference
    principles:
      - prose.principle:reference-before-decoration
    experience_contracts:
      - prose.experience_contract:review-cites-memory
    patterns:
      - composition.pattern:command-first-reference
    evidence:
      - path: apps/docs/src/content/docs/cli-reference.mdx
        note: Existing CLI reference keeps command material central.

principles:
  - id: reference-before-decoration
    principle: Reference surfaces prioritize the working task before visual flourish.
    applies_to:
      surface_types:
        - reference-page
    guidance:
      - Lead with the thing users came to inspect or run.
      - Treat decorative structure as secondary to command accuracy.
    evidence:
      - path: apps/docs/src/content/docs/cli-reference.mdx
    counterexamples:
      - Hero-only pages that hide commands below the fold.
    check_refs:
      - check:no-hardcoded-brand-color

experience_contracts:
  - id: review-cites-memory
    contract: Advisory review findings cite the diff and relevant fingerprint refs.
    applies_to:
      scopes:
        - docs-site
    obligations:
      - Cite prose, inventory, composition, checks, or memory when raising drift.
    evidence:
      - path: packages/ghost/src/review-packet.ts
    check_refs:
      - check:review-packet-citations
```

Use prose for statements about audience needs, product obligations, acceptable
tradeoffs, what the surface refuses to become, and contracts that should shape
agent behavior. Do not put generated source material,
large file lists, or deterministic detector configuration here.

## `inventory.yml`

`inventory.yml` is curated material. It tells the agent where the product lives,
which building blocks matter, which examples are canonical enough to inspect,
and which external or generated sources are available as orientation.

```yaml
topology:
  scopes:
    - id: docs-site
      paths:
        - apps/docs
      surface_types:
        - docs-home
        - reference-page
  surface_types:
    - docs-home
    - reference-page

building_blocks:
  tokens:
    - --color-bg
    - --color-fg
  components:
    - Button
    - CodeBlock
  libraries:
    - packages/ghost-ui
  assets:
    - apps/docs/public/placeholder.svg
  routes:
    - /docs
    - /docs/cli-reference
  files:
    - apps/docs/src/content/docs/cli-reference.mdx
  notes:
    - Generated CLI manifest feeds the reference page.

exemplars:
  - id: cli-reference-page
    path: apps/docs/src/content/docs/cli-reference.mdx
    title: CLI reference page
    surface_type: reference-page
    scope: docs-site
    note: Dense reference surface with command details near examples.
    why: Shows the preferred relationship between command facts and explanatory prose.
    refs:
      - prose.principle:reference-before-decoration
      - composition.pattern:command-first-reference

sources:
  - id: generated-inventory
    kind: cache
    ref: sources/cache/inventory.json
    note: Refreshable observed repo facts.
  - id: ghost-ui-registry
    kind: registry
    ref: packages/ghost-ui/public/r/registry.json
```

Supported `sources[].kind` values are `cache`, `registry`, `file`, `url`, and
`package`. Source links are provenance and orientation. They do not make
generated material canonical by themselves.

Inventory-only evidence can support a check or review finding, but it does not
establish surface-composition guidance alone. Durable guidance belongs in
`prose.yml` or `composition.yml`.

## `composition.yml`

`composition.yml` captures the patterns that make a surface feel intentional. A
pattern is reusable guidance about structure, layout, flow, state, behavior,
visual language, or content.

```yaml
patterns:
  - id: command-first-reference
    kind: structure
    pattern: Reference pages place command facts before narrative framing.
    applies_to:
      surface_types:
        - reference-page
    guidance:
      - Keep command names, flags, and examples visually adjacent.
      - Put caveats near the command they modify.
    evidence:
      - path: apps/docs/src/content/docs/cli-reference.mdx
        note: Command sections group usage and explanations together.
    anti_patterns:
      - Separating examples from the command they demonstrate.
      - Introducing broad marketing copy before actionable details.
    check_refs:
      - check:no-hardcoded-brand-color
```

Pattern `kind` can be `rule`, `layout`, `structure`, `flow`, `state`,
`visual`, `behavior`, or `content`.

Use composition for repeatable surface logic: common arrangements, state
behavior, content sequencing, responsive expectations, density choices, and
interaction flow. Keep one-off facts in inventory and broad intent in prose.

## Typed References

Ghost uses typed refs to connect layers without guessing:

- `prose.situation:<id>`
- `prose.principle:<id>`
- `prose.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `check:<id>`

Refs are lowercase slug ids after the colon. Use refs when a situation depends
on a principle, an exemplar demonstrates a pattern, a check derives from prose,
or a review finding needs to show why a change departs from the fingerprint.

Layer refs without `check:` are used where only fingerprint layer material is
valid, such as `inventory.exemplars[].refs`.

## Enforcement

`fingerprint/enforcement/checks.yml` is optional deterministic enforcement. It
uses `ghost.checks/v1` and is not generation input.

```yaml
schema: ghost.checks/v1
id: example-docs
checks:
  - id: no-hardcoded-brand-color
    title: Use semantic color tokens
    status: active
    severity: serious
    derivation:
      prose:
        - prose.principle:reference-before-decoration
      inventory:
        - inventory.exemplar:cli-reference-page
      composition:
        - composition.pattern:command-first-reference
    applies_to:
      scopes:
        - docs-site
      paths:
        - apps/docs
      surface_types:
        - reference-page
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.92
      observed_count: 12
      examples:
        - apps/docs/src/styles/theme.css
        - path: apps/docs/src/app/page.tsx
          note: Repeated hardcoded color was replaced with a token.
    repair: Move repeatable colors into semantic tokens.
```

Check `status` can be `active`, `proposed`, or `disabled`. `severity` can be
`critical`, `serious`, or `nit`.

Detector `type` can be:

- `forbidden-regex`
- `required-regex`
- `banned-import`
- `banned-component`
- `required-token`

Ref-backed checks are preferred. Missing derivation refs lint as warnings, not
errors, so teams can draft gates while curation catches up. Promote only rules
that can be detected deterministically; taste stays in prose or composition
until there is a reliable detector.

## Memory

`fingerprint/memory/intent.md` is optional human-authored or human-approved
context. Use it for constraints, audience notes, strategic intent, exceptions,
and tradeoffs that should not be inferred from code alone.

`fingerprint/memory/decisions/*.yml` stores accepted, rejected, or superseded
surface-composition rationale:

```yaml
schema: ghost.decision/v1
id: keep-reference-dense
status: accepted
title: Keep CLI reference pages dense
claim: CLI reference pages should remain compact and task-first.
rationale: Users arrive with a command-shaped task and need fast comparison.
scope:
  surface_types:
    - reference-page
evidence:
  - path: apps/docs/src/content/docs/cli-reference.mdx
    note: Existing surface is organized around command lookup.
decided_at: '2026-06-04T00:00:00-04:00'
```

Accepted decisions can enrich review packets when memory is included. Rejected
or superseded decisions are history, not canonical instructions.

## Generated Sources

`fingerprint/sources/cache/` is optional generated source material. Cache answers
what exists; the core layers answer what the surface is trying to do.

Use cache when observed repo facts are useful:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory > .ghost/fingerprint/sources/cache/inventory.json
```

Then curate durable conclusions into `inventory.yml`, `prose.yml`, or
`composition.yml`. Cache never counts as layer readiness and can be regenerated
or deleted without losing approved fingerprint layers.

## Nested Packages

Large repos can add scoped fingerprint packages below the root:

```text
.ghost/fingerprint/...
apps/checkout/.ghost/fingerprint/...
apps/checkout/review/page.tsx
```

For a path such as `apps/checkout/review/page.tsx`, Ghost resolves each
`<memory-dir>/fingerprint/manifest.yml` from root to leaf. The merged stack is
broad-to-local:

- child entries with the same `id` replace parent entries;
- scalar summary fields use the nearest child value;
- arrays merge with de-dupe;
- child-relative paths normalize to repo-root paths in reports;
- checks merge by `id`, so a child check with `status: disabled` suppresses an
  inherited active check;
- intent files concatenate with layer headings;
- decisions merge by `id`, with child entries winning.

Use nested packages when an area has genuinely different surface composition, not
just because it has different files.

## Readiness

`ghost scan --format json` reports deterministic readiness in the three-layer
vocabulary:

- useful `prose` means a non-empty summary field, situation, principle, or
  experience contract;
- useful `inventory` means topology scopes or surface types, curated building
  blocks, or exemplars;
- useful `composition` means at least one pattern.

A package is fingerprint-ready when all three core layers contain useful
content. `ghost scan` does not call an LLM; it is a handoff state for the host
agent.

## Lifecycle

Start with the package scaffold:

```bash
ghost init
```

Orient from observed repo facts only when useful:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory > .ghost/fingerprint/sources/cache/inventory.json
```

Curate the core layers:

```text
fingerprint/prose.yml          surface intent
fingerprint/inventory.yml      curated material and exemplars
fingerprint/composition.yml    reusable experience patterns
```

Validate before relying on the package:

```bash
ghost scan --format json
ghost lint .ghost
ghost verify .ghost --root .
```

Use the fingerprint across the lifecycle:

```bash
ghost emit context-bundle
ghost check --base main --format json
ghost review --base main --include-memory
ghost emit review-command
```

## Authoring Rules

- Write durable surface intent in `prose.yml`.
- Write curated repo material and exemplars in `inventory.yml`.
- Write repeatable experience patterns in `composition.yml`.
- Write deterministic gates in `enforcement/checks.yml`.
- Write human-approved intent and rationale in `memory/`.
- Keep generated observations in `sources/cache/`.
- Prefer typed refs over prose-only cross-links.
- Keep ids stable after review because refs and checks depend on them.
- Let Git review approve changes to canonical fingerprint layers.

Do not:

- describe root-level `fingerprint.md` or direct `fingerprint.yml` as the new
  canonical package input;
- treat cache output as canonical surface guidance;
- promote subjective taste directly into a check without a deterministic
  detector;
- put structural gate configuration in prose;
- use `.ghost/config.yml` as portable surface context.

## Legacy Material

Older repos may still contain `resources.yml`, `map.md`, `survey.json`,
`patterns.yml`, direct `fingerprint.md`, or direct `fingerprint.yml` files.
Those files can inform migration, compare, or legacy workflows, but new Ghost
work should target the split portable package under `.ghost/fingerprint/`.
