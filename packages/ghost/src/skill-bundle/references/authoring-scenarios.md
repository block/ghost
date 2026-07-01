---
name: authoring-scenarios
description: Choose the right human-agent workflow for authoring Ghost brand fingerprints.
handoffs:
  - label: Validate the fingerprint
    command: ghost validate --format json
    prompt: Classify this repo's fingerprint authoring scenario and confirm the package validates.
---

# Recipe: Collaborative Fingerprint Authoring

**Goal:** help a human and agent co-author durable brand truths without turning
raw repo scans into brand truth.

Human intent anchors the truths. Code, docs, examples, and UI provide evidence.
Agent synthesis is draft work until the human curates it and ordinary Git review
accepts it.

`auto-draft` is an optional skill mode for reducing blank-page cost. It scans
first and writes starter node edits, but those edits stay draft work until the
human curates them and Git review accepts them.

## 1. Start With One Repeated Decision

Do not try to fingerprint the whole brand at once. Ask the human (or find in
review history) the one decision whose feedback keeps repeating — the checkout
always flagged for trust, the voice always re-toned, the empty state always
rewritten — and capture that one truth as a node first. One high-confidence truth
beats an empty catalog; the fingerprint grows as the next repeated decision shows
up.

The scenario below tunes the authoring *posture* for that first node; it is not a
gate to clear before writing anything.

| Scenario | Default authoring posture |
| --- | --- |
| Net new brand | Human-led. Capture stance, audience, and early anti-goals before adding much inventory. |
| Net new + UI library | Human-led with library evidence. Record how this brand uses the library, not just that it exists. |
| Existing product | Human + scan. Use scans to find repeated patterns and exemplars; ask which are canonical. |
| Existing, mixed quality | Curated scan. Separate canonical examples from drift, legacy debt, and accidental repetition. |
| Design system / UI library | Grammar-led. Describe primitives, component behavior, token posture, and composition constraints. |
| Rebrand, redesign, migration | Human-led transition. Capture current, target, and migration cautions. |
| Prototype becoming product | Ratification-led. Preserve only the emergent patterns a human wants to keep. |
| Fork, white label, tenant variant | Shared base + local divergence. Keep common truths broad; scope divergence with conditions. |
| Monorepo or product suite | One contract per package. |

If more than one applies, start with the broad scenario, then narrow.

Use auto-draft when an existing repo has enough evidence to support a starter
sketch. Avoid it for net-new brands, thin prototypes, major redesigns, or
mixed-quality repos where repeated code may mostly be legacy.

## 2. Interview The Human

Ask only high-leverage questions that change the fingerprint:

- What should this brand feel like, and what should it never become?
- Who is the audience, and what are they trying to get done?
- Which screens, flows, or examples show the brand at its best?
- Which current patterns are legacy, accidental, experimental, or low quality?
- Where do trust, density, pacing, accessibility, recovery, or disclosure matter most?
- Which truths are universal, and which only hold under a specific situation?

Capture human-authored or human-approved answers as nodes. Do not treat
unapproved notes as canonical.

When auto-draft is requested, move the interview after the starter draft and use
it to curate claims.

## 3. Scan For Evidence

Read the brand and the product, not just the component library. Inspect routes,
components, stories, tests, docs, copy, tokens, and examples that reveal stance,
hierarchy, behavior, trust, and flow. Read the repo directly (tree, grep, source
inspection) for raw observations; treat them as scratch evidence.

## 4. Draft The Nodes

Write the smallest useful set of nodes, each a purpose-coherent prose truth with
a one-line `description`, named `<kind>.<slug>.md` (or a bare slug when
uncategorized). Write each body through the intent / inventory / composition
lenses: the why, the material (with pointers to implementation), and how it is
assembled. These are lenses, not fields.

State universal truths plainly; give narrower truths a **condition** in the prose
— the situation they apply in, never a destination. Label uncertain reasoning as
provisional. Prefer a few high-confidence truths over a broad catalog.

## 5. Curate With The Human

Before treating draft content as durable, ask the human to classify important
claims:

- keep as canonical
- soften into guidance
- reject as accidental or legacy
- move to scratch notes
- restate at a broader or narrower altitude (add or drop a condition)

## 6. Decide Kinds And Altitude

Two authoring decisions replace any notion of hierarchy:

- **Kind** — declare the category vocabulary in `glossary.md` and name each node
  `<kind>.<slug>.md` so its normative weight is clear (a `principle` is
  always-on; a `condition` is situational; an `exemplar` is illustrative). Kinds
  are your choice; Ghost ships no fixed vocabulary.
- **Altitude** — state a truth at the level it is actually true. Universal → state
  it plainly. Narrower → name the situation that activates it, in the prose. Never
  file a truth by destination (`for-emails.md`); the model reads the condition and
  decides when it applies.

## 7. Validate And Ratify

```bash
ghost validate .ghost
```

`validate` checks artifact shape, per-node validity, and that each node's kind
prefix is a declared glossary category (undeclared → warning with a "did you
mean" suggestion). Use ordinary Git review as the approval boundary: uncommitted
edits are drafts; checked-in nodes are canonical.

## Never

- Never copy raw repo observations into canonical nodes without curation.
- Never claim repetition frequency is brand authority.
- Never invent a hierarchy, inheritance, or edges — the package is flat.
- Never file a truth by destination; state its condition in the prose.
