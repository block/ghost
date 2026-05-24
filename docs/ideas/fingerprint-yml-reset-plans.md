# Fingerprint.yml Reset Plans

Date: 2026-05-24

## Locked Direction

Ghost should reset around `fingerprint.yml` as canonical repo-local product
experience memory for AI agents.

Ghost should help any project tell agents what kind of product they are editing:
what the product is, which user moments matter, how surfaces should behave, what
tradeoffs to preserve, and which checks enforce non-negotiable drift. It should
work for a docs site, dashboard, SaaS app, game, component library, or internal
tool without assuming a specific company operating model.

```text
.ghost/
  fingerprint.yml      # canonical product experience memory
  checks.yml           # executable appendix
  proposals/           # pending memory changes
  cache/               # generated inventory and evidence cache
```

This is a breaking change. The old root bundle shape is not supported at
runtime:

```text
.ghost/resources.yml
.ghost/map.md
.ghost/survey.json
.ghost/patterns.yml
.ghost/intent.md
.ghost/decisions/
```

There is no backwards-compatibility layer and no migrator in the core plan. Old
artifacts are import material only if a future implementation chooses to write a
temporary conversion script.

Core doctrine:

- `fingerprint.yml` is the source of truth for product-experience judgment.
- `checks.yml` is not independent truth; it is executable enforcement derived
  from `fingerprint.yml`.
- `proposals/` is the only normal path for unpromoted memory changes.
- `cache/` contains generated inventory and evidence, and is never canonical.
- Inventory answers "what exists"; fingerprint answers "what matters and why."
- Agents may propose memory freely, but humans promote canonical memory.
- "On brand" means preserving product identity, hierarchy, behavior, copy,
  accessibility, and trust.

## Plan 1: Product Model

The next fingerprint should represent product experience as situated,
evidence-backed memory. It should help an agent answer:

```text
Given this task, what matters here, what precedent exists, what should be
preserved, what should be avoided, and what is still only a proposal?
```

`fingerprint.yml` should center on:

- `summary`: product identity, audience, goals, anti-goals, and tradeoffs.
- `topology`: scopes, paths, surface types, and example surfaces.
- `situations`: user/task/state moments that change experience obligations.
- `principles`: durable product-experience truths with evidence and guidance.
- `experience_contracts`: reusable obligations for interaction, content,
  disclosure, recovery, and accessibility.
- `patterns`: visual, behavioral, content, and composition patterns.
- `substrate`: compact token, component, accessibility, and responsive policy.
- `review_policy`: memory-gap, experience-gap, proposal, and review policy.

Situations are first-class because product experience depends on context. A docs
page, destructive confirmation, onboarding step, dense table, game state, and
component demo should not share the same default expectations.

Example situation:

```yaml
id: user-is-filtering-an-operations-table
user_intent: find and compare records quickly
product_obligation: preserve scan speed and reduce accidental changes
surface_type: dense-dashboard
hierarchy:
  primary: table readability and filtering
  secondary: bulk actions and record detail
  tertiary: decorative or explanatory content
refuses:
  - oversized marketing hero
  - card grid replacing comparable rows
principles:
  - principle:dense-workflows-prioritize-scanning
experience_contracts:
  - experience_contract:destructive-actions-require-clear-confirmation
patterns:
  - pattern:compact-filter-toolbar
```

Example principle:

```yaml
id: dense-workflows-prioritize-scanning
status: accepted
principle: Dense operational workflows should optimize for comparison, speed, and recovery before visual novelty.
applies_to:
  scopes: [dashboard]
  surface_types: [dense-dashboard, admin]
guidance:
  - keep primary controls close to the table or list they affect
  - preserve row comparability across breakpoints
  - keep explanatory copy short and task-adjacent
evidence:
  - path: apps/example/src/routes/orders/page.tsx
counterexamples:
  - marketing pages may use larger narrative composition
check_refs:
  - check:no-decorative-card-grid-for-dense-table
```

The product model should cover both visual and non-visual experience:

- Visual: hierarchy, density, spacing, type, surfaces, states, motion,
  responsiveness, component placement.
- Behavioral: task flow, reversibility, validation, recovery, progressive
  disclosure, loading strategy.
- Content: labels, tone, empty/error state purpose, explanation level,
  terminology.
- Trust: confirmation, auditability, permissions, destructive actions, money or
  data risk.
- Accessibility: focus order, semantic roles, keyboard path, reduced motion,
  contrast.

## Plan 2: Canonical Sections

The planned `ghost.fingerprint/v1` top-level fields are:

```yaml
schema: ghost.fingerprint/v1
summary: {}
topology: {}
situations: []
principles: []
experience_contracts: []
patterns: []
substrate: {}
review_policy: {}
```

`summary` owns the plain-language product identity:

- `product`: what this project is.
- `audience`: who it serves.
- `goals`: outcomes agents should preserve.
- `anti_goals`: moves agents should avoid.
- `tradeoffs`: tensions that need explicit judgment.
- `tone`: durable content and voice guidance.

`principles` own durable product-experience truths:

- Principles are human-readable rules with evidence.
- Principles are scoped by paths, surface types, or situations.
- Principles may link to deterministic checks, but are not checks themselves.

`experience_contracts` own reusable obligations:

- Interaction obligations: confirm, undo, validate, recover, escalate.
- Content obligations: label precisely, disclose limits, keep copy task-fit.
- Accessibility obligations: preserve focus, semantics, keyboard paths, contrast.
- Trust obligations: make risk, permissions, and destructive actions explicit.

`patterns` own repeated ways experience appears:

- Visual patterns: layout, density, hierarchy, surfaces, responsive adaptation.
- Behavioral patterns: flow, state transitions, loading, empty/error handling.
- Content patterns: labels, summaries, warnings, explanations.
- Composition patterns: how multiple UI, content, and behavior pieces hold
  together as one coherent surface.

`review_policy` owns how Ghost handles uncertainty:

- `proposal_policy`: which gaps become proposals and who can promote them.
- `experience_gap_categories`: missing memory, contradictory memory, unclear
  intent, missing evidence, implementation mismatch, or eval uncertainty.
- `memory_gap_policy`: agents should name silence, continue conservatively, and
  propose durable memory after the work.

## Plan 3: Checks Relationship

Keep checks in `.ghost/checks.yml` so `fingerprint.yml` stays readable.

`fingerprint.yml` owns why and what:

```yaml
principles:
  - id: dense-workflows-prioritize-scanning
    principle: Dense operational workflows should optimize for comparison, speed, and recovery.
    check_refs:
      - check:no-decorative-card-grid-for-dense-table
```

`checks.yml` owns how to detect:

```yaml
schema: ghost.checks/v1
checks:
  - id: no-decorative-card-grid-for-dense-table
    derives_from: principle:dense-workflows-prioritize-scanning
    status: active
    applies_to:
      paths: ["apps/**/routes/**"]
    detector:
      type: forbidden-regex
      pattern: "(marketingHero|decorativeCardGrid)"
    repair: Preserve dense row comparison for operational tables.
```

Validation rules:

- Every `status: active` check must include `derives_from`.
- `derives_from` must use a typed grounding ref.
- Valid grounding prefixes are `principle`, `situation`,
  `experience_contract`, `pattern`, and `substrate`.
- A typed grounding ref must reference existing memory in `fingerprint.yml`.
- Orphan active checks fail `ghost lint` and `ghost verify`.
- Proposed checks may be ungrounded while still in `proposals/`, but they cannot
  become active until grounded.

Checks should remain deterministic. Advisory taste is not allowed to become CI
law without human promotion and a reliable detector.

## Plan 4: Breaking Implementation

The implementation should not preserve runtime compatibility with the old root
bundle.

Phase 1: Doctrine and schema.

- Add docs defining the new artifact authority.
- Add `ghost.fingerprint/v1` schema and TypeScript types for `summary`,
  `topology`, `situations`, `principles`, `experience_contracts`, `patterns`,
  `substrate`, and `review_policy`.
- Add fixtures for valid minimal, valid full, and invalid fingerprints.
- No command behavior changes in this first PR.

Phase 2: Checks grounding.

- Extend `ghost.checks/v1` with required `derives_from` for active checks.
- Validate active checks against typed refs in `fingerprint.yml`.
- Update check fixtures and lint/verify tests.

Phase 3: Command rewrite.

- `ghost init` creates only:

  ```text
  .ghost/fingerprint.yml
  .ghost/checks.yml
  .ghost/proposals/
  .ghost/cache/
  ```

- `ghost lint` validates `fingerprint.yml`, `checks.yml`, proposals, and cache
  shape when present.
- `ghost verify` validates evidence paths, typed refs, check references, and
  active check grounding.
- `ghost brief` emits task-scoped context from selected situation, relevant
  summary, principles, `experience_contracts` entries, patterns, substrate,
  active checks, open proposals, and known gaps.
- `ghost review` builds advisory context from situations, principles,
  `experience_contracts` entries, patterns, substrate, checks, and proposals.
- `ghost check` evaluates active checks in `checks.yml`.
- `ghost compare` compares canonical fingerprints.
- `ghost emit context-bundle` emits a compact prompt from the canonical
  fingerprint.

Phase 4: Inventory replacement.

- Remove `survey` as a supported concept.
- Add `ghost inventory collect` for optional generated observations.
- Write generated observations to `.ghost/cache/inventory.json`.
- Inventory must not be required for a valid fingerprint.

Phase 5: Dogfood migration.

- Convert this repo's `.ghost` memory to the new layout.
- Delete legacy root artifacts from this repo.
- Add a changeset for the breaking package behavior.

Phase 6: Workflow and quality layer.

- Add proposal workflow commands.
- Add quality/eval commands or artifacts after the new model is stable.

## Plan 5: Agent Workflows And Self-Healing

Normal agent loop:

```text
brief -> generate/change -> check/review -> remediate code -> propose memory -> human promotes
```

`ghost brief` should return a compact task-scoped packet:

- selected situation
- relevant summary
- applicable principles
- applicable `experience_contracts` entries
- matching patterns
- active checks
- open proposals that may affect the work
- known gaps and risks

Generation rules:

- Start from relevant situations, principles, `experience_contracts` entries,
  and patterns.
- Prefer local components and substrate policy.
- Preserve hierarchy, density, flow, copy fit, accessibility, and recovery
  behavior.
- Do not infer full product flow from component-demo or substrate-only evidence.
- If memory is silent, say so and create a proposal after the work if needed.

Review rules:

- `ghost check` is blocking and deterministic.
- `ghost review` is advisory and evidence-routed.
- Advisory findings must cite a diff location, matching memory, evidence or
  example, and a concrete repair.
- Findings classify as `fix`, `intentional-divergence`, `missing-memory`,
  `experience-gap`, or `eval-uncertainty`.

Remediation rules:

- Fix code before changing memory.
- Do not regenerate cache or inventory to absorb drift.
- If drift is intentional, create a proposal.
- If an agent cannot preserve product experience because memory is missing or
  contradictory, emit a proposal.
- Large refactors should become separate changes, not automatic remediation.

Proposal lifecycle:

```text
open -> accepted -> promoted
open -> rejected
open -> superseded
open -> needs-evidence
open -> needs-human-intent
```

Proposal types:

- `missing-memory`
- `intentional-divergence`
- `experience-gap`
- `check-candidate`

Agents may create and update proposals. Agents may not promote proposals without
explicit human approval.

## Plan 6: Quality And Evals

Ghost quality should evaluate whether generated work preserves product
experience, not just whether it uses the right tokens.

Quality layers:

- Deterministic checks: gate CI.
- Visual/screenshot evals: produce evidence.
- Advisory review: identifies product-experience drift.
- Human decisions: promote durable memory.

Situation-specific evals:

- new route or screen
- existing route modification
- new reusable component
- component variant
- form workflow
- data table or dense operational surface
- empty state
- error state
- loading state
- destructive confirmation
- navigation or shell change
- marketing/editorial surface
- onboarding flow
- settings/admin surface
- responsive adaptation
- game state or canvas interaction
- intentional divergence

Eval sets should include:

- gold examples
- acceptable variants
- counterexamples
- hard negatives
- intentional divergences
- regression cases

Counterexamples should test non-visual failures too:

- correct tokens but wrong hierarchy
- correct components but missing empty/error states
- polished marketing copy in utilitarian workflows
- dense operational UI turned into decorative cards
- responsive layout preserving colors but breaking task flow
- game surface preserving controls but breaking play readability

CI policy:

- Required: `ghost lint`, `ghost verify`, `ghost check`.
- Advisory: `ghost review`, screenshot/visual evidence, proposal suggestions.
- CI must not rewrite `.ghost/*`.
- CI must not fail on advisory-only judgment.
- Active checks should target high precision and low false positives.

## OSS Litmus Test

The model is public-ready only if it works without special company context.

It should be understandable and useful for:

- A tiny React app with one or two routes.
- A docs site with editorial pages and API references.
- A dense dashboard with tables, filters, and destructive actions.
- A component library that needs examples, variants, and accessibility rules.
- A simple game where readability, controls, state, and response matter more
  than enterprise workflow concepts.

If a concept only makes sense for a large platform company, it should not be a
required top-level field.

## First PR Acceptance Criteria

The first PR is doctrine plus schema only.

It is complete when:

- The new model is documented.
- `ghost.fingerprint/v1` schema and TypeScript types exist.
- Valid and invalid fingerprint fixtures exist.
- Schema/lint tests cover minimal and full examples.
- Typed grounding refs are validated in fixtures.
- The OSS litmus test appears in docs or fixtures.
- No command rewrite is required yet.
- No legacy compatibility work is introduced.

Schema fixtures:

- minimal valid `fingerprint.yml`
- full valid `fingerprint.yml`
- invalid unknown typed ref
- invalid active check without `derives_from`
- invalid active check pointing to missing memory

Workflow scenarios:

- `ghost lint` accepts a fingerprint without inventory cache.
- `ghost verify` validates evidence paths and typed check refs.
- `ghost brief` prefers situations, principles, and `experience_contracts` over
  raw inventory.
- `ghost review` can report missing memory without failing CI.
- `ghost check` runs only deterministic active checks.

Quality scenarios:

- Correct tokens but wrong hierarchy is advisory drift.
- Correct components but missing confirmation or recovery behavior is advisory
  drift, or blocking if check-backed.
- Intentional divergence creates a proposal, not a cache rewrite.
- Experience gaps become reviewable product signal, not silent generation
  failure.

## Final Success Criteria

The reset is complete when:

- A repo with only `.ghost/fingerprint.yml`, `.ghost/checks.yml`,
  `.ghost/proposals/`, and `.ghost/cache/` can run the core Ghost workflow.
- Old root bundle artifacts are no longer required or supported at runtime.
- Active checks cannot exist without canonical grounding.
- Agents brief from situations, principles, `experience_contracts`, and
  patterns, not raw inventory.
- Generated inventory is optional cache.
- Memory changes flow through proposals and human promotion.
- Experience gaps become reviewable product signal.
- Ghost can evaluate both visual and non-visual product-experience fidelity.
