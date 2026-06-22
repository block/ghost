# The Portable Fingerprint Package Format

A Ghost fingerprint is a checked-in, repo-local surface-composition contract
that humans can approve and agents can act from. The canonical portable package
lives under `.ghost/fingerprint/`:

```text
.ghost/
  config.yml                    # optional local routing; not portable context
  fingerprint/
    manifest.yml                # ghost.fingerprint-package/v1 package anchor
    prose.yml                   # core: surface intent
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
implementation roots and reference libraries rather than surface context.

`manifest.yml` is intentionally small:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

The raw layer files can be sparse. Missing files or sections normalize to empty
layers when Ghost assembles the internal `ghost.fingerprint/v1` document used
by checks, review packets, Relay briefs, compare, and stack merges.

## Core Layers

`prose.yml` captures the intent behind the surface:

```yaml
summary:
  product: Example Docs
  audience: [contributors, maintainers]
  goals:
    - Preserve task-first documentation and product trust.
principles:
  - id: prose-before-cache
    principle: Prose captures the intent behind the surface; generated cache only explains what exists.
experience_contracts:
  - id: review-cites-memory
    contract: Advisory review findings must cite the diff and relevant fingerprint refs.
```

Use prose for durable claims about audience needs, product obligations,
acceptable tradeoffs, what the surface refuses to become, and contracts that
should shape agent behavior.

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
  libraries: [packages/ghost-ui]
  assets: [apps/docs/public/placeholder.svg]
  routes: [/docs, /docs/cli-reference]
  files: [apps/docs/src/content/docs/cli-reference.mdx]
exemplars:
  - id: cli-reference-page
    path: apps/docs/src/content/docs/cli-reference.mdx
    title: CLI reference page
    surface_type: reference-page
    scope: docs-site
    why: Shows command facts and examples kept visually adjacent.
    refs: [composition.pattern:reference-before-decoration]
sources:
  - id: generated-inventory
    kind: cache
    ref: sources/cache/inventory.json
    note: Refreshable observed repo facts.
  - id: ghost-ui-registry
    kind: registry
    ref: packages/ghost-ui/public/r/registry.json
```

Supported `inventory.sources[].kind` values are `cache`, `registry`, `file`,
`url`, and `package`. Source links are provenance and orientation; they do not
make generated material canonical by themselves.

`composition.yml` captures the patterns that make a surface feel intentional:

```yaml
patterns:
  - id: reference-before-decoration
    kind: structure
    pattern: Reference pages prioritize the working surface before visual flourish.
    applies_to:
      surface_types: [reference-page]
    guidance:
      - Keep command names, flags, and examples visually adjacent.
      - Put caveats near the command they modify.
    evidence:
      - path: apps/docs/src/content/docs/cli-reference.mdx
    check_refs: [check:no-hardcoded-brand-color]
```

Pattern `kind` can be `rule`, `layout`, `structure`, `flow`, `state`,
`visual`, `behavior`, or `content`.

## References

Use layer-qualified refs when one part of the fingerprint grounds another:

- `prose.situation:<id>`
- `prose.principle:<id>`
- `prose.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `check:<id>`

Layer refs without `check:` are used where only fingerprint layer material is
valid, such as `inventory.exemplars[].refs`.

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
      prose:
        - prose.principle:reference-before-decoration
      inventory:
        - inventory.exemplar:cli-reference-page
      composition:
        - composition.pattern:reference-before-decoration
    applies_to:
      scopes: [docs-site]
      paths: [apps/docs]
      surface_types: [reference-page]
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

## Memory And Sources

`fingerprint/memory/intent.md` is optional human-authored or human-approved
intent: constraints, tradeoffs, audience notes, and known exceptions that
should not be inferred from code alone.

`fingerprint/memory/decisions/*.yml` stores accepted, rejected, or superseded
surface-composition rationale using `ghost.decision/v1`:

```yaml
schema: ghost.decision/v1
id: keep-reference-dense
status: accepted
title: Keep CLI reference pages dense
claim: CLI reference pages should remain compact and task-first.
rationale: Users arrive with a command-shaped task and need fast comparison.
scope:
  surface_types: [reference-page]
evidence:
  - path: apps/docs/src/content/docs/cli-reference.mdx
decided_at: '2026-06-04T00:00:00-04:00'
```

`ghost review --include-memory` reads accepted decisions. Rejected or
superseded decisions are history, not canonical instructions.

`fingerprint/sources/cache/` is refreshable generated material. It can help an
agent update `inventory.yml`, but cache files never count as fingerprint
readiness by themselves.

## Nested Packages

Large repos can add scoped packages below the root:

```text
.ghost/fingerprint/...
apps/checkout/.ghost/fingerprint/...
apps/checkout/review/page.tsx
```

For a path like `apps/checkout/review/page.tsx`, Ghost resolves each
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

Use nested packages when an area has genuinely different surface composition,
not just because it has different files.

For workspace monorepos, start with a safe plan:

```bash
ghost init --monorepo
```

This creates or preserves the root `.ghost/` package, detects child package
roots from workspace metadata, and prints proposed `ghost init --scope ...`
commands. Add `--apply` when you want Ghost to create the detected child
packages:

```bash
ghost init --monorepo --apply
```

## Core Commands

```bash
ghost init
ghost scan --format json
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main --format json
ghost review --base main --include-memory
ghost emit review-command --path apps/checkout/review/page.tsx
ghost relay gather apps/checkout/review/page.tsx
```

`ghost scan` reports readiness in the same three-layer vocabulary. Useful
`prose` means any non-empty summary field, situation, principle, or experience
contract. Useful `inventory` means topology scopes or surface types, curated
building blocks, or exemplars. Useful `composition` means at least one pattern.

Use generated cache when observed repo facts are useful source material:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory > .ghost/fingerprint/sources/cache/inventory.json
```

Curate durable conclusions into `prose.yml`, `inventory.yml`, or
`composition.yml`.

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

Legacy `resources.yml`, `map.md`, `survey.json`, `patterns.yml`, direct
`fingerprint.md`, and direct `fingerprint.yml` files may appear in older repos
or explicit compatibility workflows. New Ghost work should target the split
portable package under `.ghost/fingerprint/`.
