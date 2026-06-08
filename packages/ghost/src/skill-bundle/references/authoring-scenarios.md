---
name: authoring-scenarios
description: Choose the right human-agent workflow for authoring Ghost fingerprints.
handoffs:
  - label: Inspect fingerprint readiness
    command: ghost scan --format json
    prompt: Classify this repo's fingerprint authoring scenario and summarize missing layers.
  - label: Inspect nested stacks
    command: ghost stack <path>
    prompt: Decide whether this path needs local fingerprint guidance or can inherit the root package.
---

# Recipe: Collaborative Fingerprint Authoring

**Goal:** help a human and agent co-author durable product-experience memory
without turning raw repo scans into product truth.

Human intent decides identity. Code, docs, examples, screenshots, stories, and
UI libraries provide evidence. Agent synthesis is draft work until the human
curates it and ordinary Git review accepts it.

## 1. Classify The Scenario

Choose the nearest scenario before writing fingerprint layers:

| Scenario | Default authoring posture |
| --- | --- |
| Net new repo | Human-led. Capture intent, audience, product posture, and early anti-goals before adding much inventory. |
| Net new repo + UI library | Human-led with library evidence. Record how this product uses the library, not just that the library exists. |
| Existing repo | Human + scan. Use repo scans to find repeated patterns and exemplars; ask which ones are canonical. |
| Existing repo with mixed quality | Curated scan. Separate canonical examples from drift, legacy debt, and accidental repetition. |
| Design system or UI library | Grammar-led. Describe primitives, component behavior, token posture, accessibility, and composition constraints. |
| Rebrand, redesign, or migration | Human-led transition. Capture current, target, and migration cautions; use decisions for rationale. |
| Prototype becoming product | Ratification-led. Preserve only the emergent patterns a human wants to keep. |
| Fork, white label, or tenant variant | Shared base + local divergence. Keep common identity broad and local differences scoped. |
| Monorepo or nested surfaces | Stack-aware. Use root guidance for product-family identity and nested packages for surfaces judged differently. |

If more than one scenario applies, start with the broad repo scenario, then run
the nested decision test for individual products, apps, or feature areas.

## 2. Interview The Human

Ask only high-leverage questions that change the fingerprint:

- What should this product feel like, and what should it never become?
- Who is the audience, and what are they trying to get done?
- Which screens, flows, stories, or examples show the product at its best?
- Which current patterns are legacy, accidental, experimental, or low quality?
- Where do trust, density, pacing, accessibility, recovery, or disclosure matter most?
- Are there surfaces where the same UI decision should be judged differently?

Use human-authored or human-approved answers in `prose.yml` and optional
`fingerprint/memory/intent.md`. Do not treat unapproved notes as canonical.

## 3. Scan For Evidence

Read the product, not just the component library. Inspect routes, components,
stories, tests, docs, screenshots, examples, copy, tokens, assets, and UI
library references that reveal identity, hierarchy, behavior, accessibility,
trust, and flow.

Optional cache:

```bash
mkdir -p .ghost/fingerprint/sources/cache
ghost inventory . > .ghost/fingerprint/sources/cache/inventory.json
```

Treat generated cache as scratch evidence. It can support curated entries in
`inventory.yml`, but it does not establish product judgment by itself.

## 4. Draft The Core Layers

Write the smallest useful durable content:

- `prose.yml`: product summary, audience, situations, principles, contracts,
  anti-goals, and tradeoffs.
- `inventory.yml`: topology, building blocks, source links, and curated
  exemplars the agent can inspect or use.
- `composition.yml`: patterns, layouts, structures, flows, states, content,
  behavior, and visual arrangements.

Label uncertain reasoning in the working notes as provisional. Prefer a few
high-confidence claims with evidence over a broad catalog.

## 5. Curate With The Human

Before treating draft content as durable memory, ask the human to classify
important claims:

- keep as canonical
- soften into guidance
- reject as accidental or legacy
- move to generated cache or scratch notes
- scope to a nested package
- record as a decision
- convert into a deterministic check

Only add checks when the rule can be enforced deterministically. Subjective
composition judgment belongs in `composition.yml` or advisory review, not in a
blocking gate.

## 6. Decide Nested Packages

Create or update a local `.ghost/` only when a surface would be judged
differently from the root package.

Use a nested package when the local surface has distinct:

- users or jobs-to-be-done
- density or information architecture
- trust, safety, privacy, or recovery posture
- interaction rhythm or workflow length
- component grammar or UI library usage
- review criteria for the same UI decision

Keep broad product-family guidance at the root. Put local obligations in the
nearest package that owns the surface. Validate nested repos with stack-aware
commands:

```bash
ghost stack <path>
ghost lint --all
ghost verify --all
```

## 7. Validate And Ratify

Validate before calling layers complete:

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost check --base HEAD
```

Use ordinary Git review as the approval boundary. Uncommitted or unmerged
fingerprint edits are drafts; checked-in `fingerprint/` core files are the
canonical package.

## Never

- Never copy raw inventory into canonical layers without curation.
- Never claim scan frequency is product authority.
- Never make `fingerprint/memory/intent.md` authoritative unless human-authored
  or human-approved.
- Never create nested packages just to mirror directory structure.
- Never turn advisory composition judgment into a deterministic gate.
