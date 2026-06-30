---
name: authoring-scenarios
description: Choose the right human-agent workflow for authoring Ghost fingerprints.
handoffs:
  - label: Validate the fingerprint
    command: ghost validate --format json
    prompt: Classify this repo's fingerprint authoring scenario and confirm the package validates.
---

# Recipe: Collaborative Fingerprint Authoring

**Goal:** help a human and agent co-author durable product-surface composition
without turning raw repo scans into product truth.

Human intent anchors surface composition. Code, docs, examples, screenshots,
stories, and UI libraries provide evidence. Agent synthesis is draft work until
the human curates it and ordinary Git review accepts it.

`auto-draft` is an optional skill mode for reducing blank-page cost. It scans
first and writes starter node edits, but those edits are still draft work
until the human curates them and Git review accepts them.

## 1. Start With One Repeated Decision

The hardest part is picking the first surface, so do not try to fingerprint the
whole product. Ask the human (or find in review history) the one surface whose
feedback keeps repeating — the checkout always flagged for trust, the settings
form always re-paced, the empty state always rewritten — and capture that one
decision as a node first. One high-confidence node beats an empty catalog; the
fingerprint grows surface by surface as the next repeated decision shows up.

The scenario below tunes the authoring *posture* for that first node; it is not
a gate to clear before writing anything.

Choose the nearest scenario before writing nodes:

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

Capture human-authored or human-approved answers as nodes. Do not treat
unapproved notes as canonical.

When auto-draft is requested, move the interview after the starter draft and
use it to curate claims instead of asking every question up front.

## 3. Scan For Evidence

Read the product, not just the component library. Inspect routes, components,
stories, tests, docs, screenshots, examples, copy, tokens, assets, and UI
library references that reveal hierarchy, behavior, accessibility, trust, and
flow.

Read the repo directly (tree, grep, source inspection) for raw observations.
Treat them as scratch evidence: they can support curated node bodies, but raw
observations do not establish surface-composition guidance by themselves.

In auto-draft mode, always survey the repo before drafting, then inspect the
high-signal files. Observed facts may seed a node's inventory content; raw
repeated patterns do not establish guidance.

## 4. Draft The Nodes

Write the smallest useful set of nodes, each a purpose-coherent prose body with
a one-line `description`, placed by putting its file in the right surface
directory and linked with `relates` where a relationship carries meaning. Write
each body through the intent / inventory / composition lenses: the why, the
material (with pointers to implementation), and how it is assembled. These are
lenses, not fields.

Label uncertain reasoning as provisional. Prefer a few high-confidence nodes
with evidence over a broad catalog. In auto-draft mode, write nodes directly
(sparse, citing concrete files where possible) and leave ambiguous product
meaning for curation.

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
composition critique belongs in a node body or advisory review, not in a
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

Validate before calling the fingerprint useful:

```bash
ghost validate .ghost
ghost review --base HEAD
```

Use ordinary Git review as the approval boundary. Uncommitted or unmerged
fingerprint edits are drafts; checked-in nodes are the canonical package.

## Never

- Never copy raw repo observations into canonical nodes without curation.
- Never claim repetition frequency is product authority.
- Never create surfaces just to mirror directory structure.
- Never turn advisory composition critique into a deterministic gate.
