---
status: settled
---

# Fingerprint-first architecture

## Thesis

Ghost is fingerprint-first.

The durable Ghost artifact is the checked-in fingerprint package: a portable
product-experience contract that humans can approve and agents can act from.
Everything else in Ghost is tooling for that contract or tooling around it.
Drift remains important, but it is one governance workflow over the fingerprint,
not the center of the architecture.

This settles the mental model for follow-on work. Existing docs already describe
`.ghost/fingerprint/` as the portable package and generation context. Older
idea docs that center `ghost-drift`, package decomposition, or drift comparison
should be read through this updated hierarchy: the fingerprint owns product
memory; tools consume, validate, compare, generate from, or govern that memory.

## Decisions

- The fingerprint package is the durable artifact. `.ghost/fingerprint/`
  remains the portable boundary, anchored by `fingerprint/manifest.yml`.
- Core generation input is `prose.yml`, `inventory.yml`, and
  `composition.yml`. Prose explains what matters and why, inventory points to
  curated material and exemplars, and composition explains how those materials
  become experience.
- Supporting material stays subordinate to the core layers:
  `enforcement/checks.yml` validates deterministic obligations,
  `memory/intent.md` and `memory/decisions/` preserve optional human-approved
  rationale, and `sources/cache/` stores refreshable observations.
- Tools are consumers or authors of the fingerprint. They may capture,
  validate, apply, govern, or compare the contract, but they do not replace it.
- Drift is governance. `check`, `review`, `ack`, `track`, and `diverge` answer
  whether a change remains faithful to the fingerprint, how intentional
  divergence is recorded, and how references shift over time.
- Git remains the approval boundary. Uncommitted or unmerged fingerprint edits
  are draft work; checked-in fingerprint files are canonical Ghost memory.

## Rationale

Agents need product-experience memory before they generate, not only after a
diff exists. Post-hoc drift review can catch violations, but it cannot be the
only way Ghost participates in the work. The highest-leverage artifact is the
structured input that lets a host agent build, revise, or explain a product
surface while preserving hierarchy, density, restraint, copy, behavior, trust,
and flow.

That makes the fingerprint more like an upstream contract than a static
guideline or a downstream inspection report. Review, linting, comparison,
generation packets, authoring tools, marketing workflows, and vibe-coding
workflows can all use the same checked-in product memory. Their outputs differ,
but their source of truth is the fingerprint.

This also keeps Ghost adapter-neutral. Codex, Claude, Cursor, Goose, CI
wrappers, docs tools, and design-system integrations can bring their own
display, policy, and execution format. Ghost owns the portable memory, stable
packets, deterministic validation, and stack resolution.

## Lifecycle taxonomy

Future docs, CLI help, skills, and examples should organize Ghost around the
fingerprint lifecycle:

| Lifecycle | Commands and consumers | Purpose |
| --- | --- | --- |
| Capture | `init`, `inventory`, `scan` | Create the package, gather optional source material, and report layer readiness. |
| Validate | `lint`, `verify` | Check schema shape, refs, evidence, exemplars, and deterministic package quality. |
| Generate / apply | `emit context-bundle`, host agents, future generation consumers | Give agents the upstream product-experience contract before they build or revise. |
| Govern | `check`, `review`, `ack`, `track`, `diverge` | Validate changed surfaces, produce advisory findings, and record stance toward divergence. |
| Compare | `compare`, fleet-style analysis | Understand distance, cohorts, reference relationships, and change across packages. |

The taxonomy is conceptual. This memo does not rename commands, change schemas,
or create public API guarantees. It gives follow-on work a shared hierarchy.

## Consequences

- Positioning should lead with the portable product-experience fingerprint, not
  drift detection. A good default sentence is: Ghost captures a portable
  product-experience fingerprint that tools use to generate, validate, compare,
  and govern product surfaces.
- Docs IA should make the lifecycle visible. Drift/review docs remain useful,
  but they should live under governance rather than define the product.
- CLI help should group commands by fingerprint lifecycle where practical.
  Existing commands can stay stable while descriptions and ordering teach the
  new mental model.
- Skill references should lead with recall, briefing, and generation from
  fingerprint layers before review, verification, and remediation workflows.
- Schema exploration may investigate richer fingerprint concepts such as
  signature moves, memorable product gestures, and executable or buildable
  inventory evidence. Those ideas are follow-on design work, not new schema in
  this memo.
- Dogfooding should update Ghost's own fingerprint and examples to express this
  identity. The repo should be able to describe itself as fingerprint-first
  before it asks other repos to do the same.

## Follow-on tracks

1. Positioning and docs language: update README, package README, and core docs
   so new adopters meet Ghost as a fingerprint system.
2. Docs information architecture: organize docs pages around capture, validate,
   generate/apply, govern, and compare.
3. CLI taxonomy: review command help, docs-generated CLI reference, and command
   ordering for lifecycle clarity without changing behavior.
4. Skill workflow: revise the installed Ghost skill bundle so agents brief and
   generate from fingerprints before reviewing drift.
5. Schema and model exploration: write separate design notes for signature
   moves and buildable inventory evidence before any schema change.
6. Dogfood fingerprint: update `.ghost/fingerprint/` for this repo and validate
   it with `ghost scan`, `ghost lint`, and `ghost verify`.

## Interface stance

This memo implements no public CLI, schema, package, export, or wire-format
change. Any future interface change should be proposed in its own plan and
linked back to this memo as rationale.

## Read-back checks

The memo is successful if:

- A new adopter can understand Ghost without assuming it is primarily a drift
  tool.
- A contributor can see why drift commands still matter.
- A follow-on agent can split docs, CLI, skill, schema, and dogfood work without
  asking what the architectural center is.
- Nothing here contradicts the current canonical package shape under
  `.ghost/fingerprint/`.
