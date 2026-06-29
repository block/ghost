---
name: authoring-scenarios
description: Choose the right human-agent workflow for authoring Ghost fingerprints.
handoffs:
  - label: Inspect fingerprint contribution
    command: ghost scan --format json
    prompt: Classify this repo's fingerprint authoring scenario and summarize absent facets.
---

# Recipe: Collaborative Fingerprint Authoring

**Goal:** help a human and agent co-author durable product-surface composition
without turning raw repo scans into product truth.

Human intent anchors surface composition. Code, docs, examples, screenshots,
stories, and UI libraries provide evidence. Agent synthesis is draft work until
the human curates it and ordinary Git review accepts it.

`auto-draft` is an optional skill mode for reducing blank-page cost. It scans
first and writes starter facet edits, but those edits are still draft work
until the human curates them and Git review accepts them.

## 1. Classify The Scenario

Choose the nearest scenario before writing fingerprint facets:

| Scenario | Default authoring posture |
| --- | --- |
| Net new repo | Human-led. Capture intent, audience, product posture, and early anti-goals before adding much inventory. |
| Net new repo + UI library | Human-led with library evidence. Record how this product uses the library, not just that the library exists. |
| Existing repo | Human + scan. Use repo scans to find repeated patterns and exemplars; ask which ones are canonical. |
| Existing repo with mixed quality | Curated scan. Separate canonical examples from drift, legacy debt, and accidental repetition. |
| Design system or UI library | Grammar-led. Describe primitives, component behavior, token posture, accessibility, and composition constraints. |
| Rebrand, redesign, or migration | Human-led transition. Capture current, target, and migration cautions; use decisions for rationale. |
| Prototype becoming product | Ratification-led. Preserve only the emergent patterns a human wants to keep. |
| Fork, white label, or tenant variant | Shared base + local divergence. Keep common surface composition broad and local differences scoped. |
| Monorepo or product suite | One contract per package. Use surfaces and the containment tree to organize locality within a single contract. |

If more than one scenario applies, start with the broad repo scenario, then
distinguish individual products, apps, or feature areas as surfaces.

Use auto-draft when an existing repo has enough product evidence to support a
starter sketch. Avoid relying on auto-draft for net-new repos, thin prototypes,
major redesigns, or mixed-quality surfaces where repeated code may mostly be
legacy or accidental.

## 2. Interview The Human

Ask only high-leverage questions that change the fingerprint:

- What should this product feel like, and what should it never become?
- Who is the audience, and what are they trying to get done?
- Which screens, flows, stories, or examples show the product at its best?
- Which current patterns are legacy, accidental, experimental, or low quality?
- Where do trust, density, pacing, accessibility, recovery, or disclosure matter most?
- Are there surfaces where the same UI decision should be assessed differently?

Use human-authored or human-approved answers in `intent.yml`. Do not treat
unapproved notes as canonical.

When auto-draft is requested, move the interview after the starter draft and
use it to curate claims instead of asking every question up front.

## 3. Scan For Evidence

Read the product, not just the component library. Inspect routes, components,
stories, tests, docs, screenshots, examples, copy, tokens, assets, and UI
library references that reveal hierarchy, behavior, accessibility, trust, and
flow.

Optional signals:

```bash
ghost signals .
```

Treat signals as scratch evidence. They can support curated entries in
`inventory.yml`, but it does not establish surface-composition guidance by
itself.

In auto-draft mode, always gather signals before drafting, then inspect the
high-signal files they point to. Signal facts may seed `inventory.yml`; scan
frequency and raw signals do not establish surface-composition guidance.

## 4. Draft The Core Facets

Write the smallest useful durable content:

- `intent.yml`: product summary, audience, situations, principles, contracts,
  anti-goals, and tradeoffs.
- `inventory.yml`: building blocks, source links, and curated
  exemplars the agent can inspect or use.
- `composition.yml`: patterns, layouts, structures, flows, states, content,
  behavior, and visual arrangements.

Label uncertain reasoning in the working notes as provisional. Prefer a few
high-confidence claims with evidence over a broad catalog.

In auto-draft mode, write directly to the facet files rather than a
separate proposal artifact. Keep entries sparse, cite concrete files or
exemplars where possible, and leave ambiguous product meaning for curation.

## 5. Curate With The Human

Before treating draft content as durable surface context, ask the human to classify
important claims:

- keep as canonical
- soften into guidance
- reject as accidental or legacy
- move to scratch notes
- place on a more specific surface
- convert into a deterministic check

Only add checks when the rule can be enforced deterministically. Subjective
composition critique belongs in `composition.yml` or advisory review, not in a
blocking gate.

## 6. Decide Surfaces

Add a distinct surface (placed in the containment tree) when part of the product
should be assessed differently from its parent.

Use a separate surface when it has distinct:

- users or jobs-to-be-done
- density or information architecture
- trust, safety, privacy, or recovery posture
- interaction rhythm or workflow length
- component grammar or UI library usage
- review criteria for the same UI decision

Keep broad product-family guidance on `core` (it cascades to every surface).
Place local obligations on the surface that owns them.

## 7. Validate And Ratify

Validate before calling facets useful:

```bash
ghost lint .ghost
ghost verify .ghost --root <target>
ghost check --base HEAD
```

Use ordinary Git review as the approval boundary. Uncommitted or unmerged
fingerprint edits are drafts; checked-in Ghost package facet files are the
canonical package.

## Never

- Never copy raw inventory into canonical facets without curation.
- Never claim scan frequency is product authority.
- Never create surfaces just to mirror directory structure.
- Never turn advisory composition critique into a deterministic gate.
