# The Root Fingerprint Bundle Format

A Ghost fingerprint is a repo-local product experience memory bundle rooted at
`.ghost/`. The canonical on-disk shape is:

```text
.ghost/
  fingerprint.yml  # canonical product experience memory
  config.yml       # optional implementation roots and reference registries/libraries
  checks.yml       # optional deterministic gates
  intent.md        # optional human-authored or human-approved intent
  decisions/       # optional ghost.decision/v1 rationale
  proposals/       # optional ghost.proposal/v1 candidate memory updates
  cache/           # optional generated inventory and other ephemeral facts
```

`fingerprint.yml` is the source of truth. `config.yml` routes implementation
and reference registry/library context without defining product intent. `checks.yml` is
the executable appendix. Proposals are unresolved candidate changes. Cache is
refreshable and may be deleted without losing canonical memory.

Legacy `resources.yml`, `map.md`, `survey.json`, and `patterns.yml` files may
still appear in older repos or as migration/source material. They are not
canonical Ghost memory.

## `fingerprint.yml`

`fingerprint.yml` uses `ghost.fingerprint/v1`. It should stay compact enough
for agents to read before generation and review.

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
    status: accepted
    principle: Canonical memory should explain what matters and why; generated inventory only explains what exists.
experience_contracts:
  - id: review-cites-memory
    status: accepted
    contract: Advisory review findings must cite the diff and the relevant fingerprint memory.
patterns:
  - id: reference-before-decoration
    status: accepted
    kind: composition
    pattern: Reference pages prioritize the working surface before visual flourish.
implementation_vocabulary:
  tokens: [--color-bg, --color-fg]
  components: [Button, CodeBlock]
  notes:
    - Use these as current implementation material, not as proof of product fit.
review_policy:
  proposal_policy:
    - Agents create proposals for missing memory, intentional divergence, experience gaps, and check candidates.
    - Humans promote durable memory into fingerprint.yml or checks.yml.
  experience_gap_categories:
    - missing-memory
    - intentional-divergence
    - experience-gap
    - check-candidate
```

Canonical sections:

| Section | Purpose |
| --- | --- |
| `summary` | Product identity, audience, goals, anti-goals, tradeoffs, and tone. |
| `topology` | Repo scopes, paths, surface types, and examples. |
| `situations` | User/task/state moments that change product obligations. |
| `principles` | Durable product experience rules and judgment. |
| `experience_contracts` | How surfaces and capabilities speak, disclose, fail, and recover. |
| `patterns` | Reusable visual, behavioral, content, or composition patterns. |
| `implementation_vocabulary` | Current tokens, components, libraries, assets, and notes available for implementation. |
| `review_policy` | How agents handle gaps, proposals, and uncertainty. |

## `checks.yml`

`checks.yml` uses `ghost.checks/v1`. Active checks are deterministic and must
declare a typed `derives_from` reference into `fingerprint.yml`.

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

## `proposals/*.yml`

Candidate memory updates use `ghost.proposal/v1`. Agents create proposals when
generation or review exposes missing memory, intentional divergence,
experience gaps, or possible deterministic checks. Proposals are never
canonical until a human promotes them.

```yaml
schema: ghost.proposal/v1
id: saved-payment-empty-state
status: open
kind: missing-memory
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery.
rationale: The user is blocked from paying, not browsing product concepts.
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: fingerprint
  summary: Promote into fingerprint.yml if repeated.
```

## Commands

```bash
ghost init --with-intent
ghost init --with-config --reference packages/ghost-ui/.ghost
ghost lint .ghost
ghost verify .ghost --root .
ghost check --base main
ghost review --base main --include-memory
ghost emit review-command
ghost emit context-bundle
```

When `--reference packages/ghost-ui/.ghost` is used, generated config points to
`registry:packages/ghost-ui/public/r/registry.json` and separately records
`packages/ghost-ui/.ghost/fingerprint.yml`. The registry is implementation
vocabulary; it is not copied into the product's own memory.

Use `ghost inventory > .ghost/cache/inventory.json` when observed repo facts are
useful source material. Promote only durable conclusions into
`fingerprint.yml`.
