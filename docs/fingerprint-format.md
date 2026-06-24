# The Portable Fingerprint Package Format

A Ghost fingerprint is a checked-in, repo-local surface-composition contract
that humans can approve and agents can act from. The canonical portable package
lives under `.ghost/`:

```text
.ghost/
  manifest.yml                  # ghost.fingerprint-package/v1 package anchor
  intent.yml                    # core: surface intent
  inventory.yml                 # core: curated material and source links
  composition.yml               # core: experience patterns
  validate.yml                  # optional deterministic gates
```

Git is the staging and approval boundary: uncommitted or unmerged edits are
draft work, and checked-in facet files are canonical for Ghost.

`manifest.yml` is intentionally small:

```yaml
schema: ghost.fingerprint-package/v1
id: local
```

The raw facet files can be sparse. Missing files or sections mean this package
contributes no local guidance for that facet; broader stack context may still
supply it. Ghost normalizes absent facets to empty values when it assembles the
internal `ghost.fingerprint/v1` document used by validation checks, review
packets, Relay briefs, compare, and stack merges.

## Core Facets

`intent.yml` captures the intent behind the surface:

```yaml
summary:
  product: Example Docs
  audience: [contributors, maintainers]
  goals:
    - Preserve task-first documentation and product trust.
principles:
  - id: intent-before-material
    principle: Intent captures the intent behind the surface; inventory points to replaceable material.
experience_contracts:
  - id: review-cites-memory
    contract: Advisory review findings must cite the diff and relevant fingerprint refs.
```

Use intent for durable claims about audience needs, product obligations,
acceptable tradeoffs, what the surface refuses to become, and contracts that
should shape agent behavior.

High-quality facet content makes generation choices explicit: what to preserve,
what to avoid, which tradeoffs win, which situations route guidance, and which
exemplars ground the claim.

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
  - id: ghost-ui-registry
    kind: registry
    ref: packages/ghost-ui/public/r/registry.json
```

Supported `inventory.sources[].kind` values are `registry`, `file`, `url`, and
`package`. Source links are provenance and orientation; they do not
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
    check_refs: [validate.check:no-hardcoded-brand-color]
```

Pattern `kind` can be `rule`, `layout`, `structure`, `flow`, `state`,
`visual`, `behavior`, or `content`.

## References

Use facet-qualified refs when one part of the fingerprint grounds another:

- `intent.situation:<id>`
- `intent.principle:<id>`
- `intent.experience_contract:<id>`
- `inventory.exemplar:<id>`
- `composition.pattern:<id>`
- `validate.check:<id>`

Facet refs without `validate.check:` are used where only fingerprint facet material is
valid, such as `inventory.exemplars[].refs`.

## Enforcement

`validate.yml` uses `ghost.validate/v1`. Checks are
deterministic validation, not generation input.

```yaml
schema: ghost.validate/v1
id: example-docs
checks:
  - id: no-hardcoded-brand-color
    title: Use semantic color tokens
    status: active
    severity: serious
    derivation:
      intent:
        - intent.principle:reference-before-decoration
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
that can be detected deterministically; taste stays in intent or composition
until there is a reliable detector.

## Nested Packages

Large repos can add scoped packages below the root:

```text
.ghost/...
apps/checkout/.ghost/...
apps/checkout/review/page.tsx
```

For a path like `apps/checkout/review/page.tsx`, Ghost resolves each
`<ghost-dir>/manifest.yml` from root to leaf. Each package is a
sparse patch: it contributes only the facets it knows, and the resolved stack
supplies the working context. The merged stack is broad-to-local:

- child entries with the same `id` replace parent entries;
- scalar summary fields use the nearest child value;
- arrays merge with de-dupe;
- child-relative paths normalize to repo-root paths in reports;
- checks merge by `id`, so a child check with `status: disabled` suppresses an
  inherited active check;
- intent situations, principles, and experience contracts merge by `id`, with
  child entries winning;
- composition patterns, inventory exemplars, and sources merge by `id`, with
  child entries winning.

Use nested packages when an area has genuinely different surface composition,
not just because it has different files. A nested package does not need to
restate inherited intent, inventory, composition, or validation checks.

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
ghost review --base main
ghost emit review-command --path apps/checkout/review/page.tsx
ghost relay gather apps/checkout/review/page.tsx
```

`ghost scan` reports package contribution facets. Useful `intent` means any
non-empty summary field, situation, principle, or experience contract. Useful
`inventory` means topology scopes or surface types, curated building blocks,
exemplars, or source links. Useful `composition` means at least one pattern.
Useful `validate` means at least one deterministic check. Absent facets are
reported as absent contributions, not incomplete packages.

Use raw repo signals when observed repo facts are useful authoring evidence:

```bash
ghost signals .
```

Curate durable conclusions into `intent.yml`, `inventory.yml`, or
`composition.yml`.

## Authoring Rules

- Write durable surface intent in `intent.yml`.
- Write curated repo material and exemplars in `inventory.yml`.
- Write repeatable experience patterns in `composition.yml`.
- Write deterministic gates in `validate.yml`.
- Prefer typed refs over prose-only cross-links.
- Keep ids stable after review because refs and checks depend on them.
- Let Git review approve changes to canonical fingerprint facets.

Do not:

- describe root-level `fingerprint.md` or direct `fingerprint.yml` as the new
  canonical package input;
- treat cache output as canonical surface guidance;
- promote subjective taste directly into a check without a deterministic
  detector;
- put structural gate configuration in intent.

Legacy `resources.yml`, `map.md`, `survey.json`, `patterns.yml`, direct
`fingerprint.md`, and direct `fingerprint.yml` files may appear in older repos
or explicit compatibility workflows. New Ghost work should target the split
portable package under `.ghost/`.
