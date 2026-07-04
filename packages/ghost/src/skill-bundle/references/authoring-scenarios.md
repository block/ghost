---
name: authoring-scenarios
description: Choose the right human-agent workflow for authoring Ghost brand fingerprints.
handoffs:
  - label: Validate the fingerprint
    command: ghost validate --format json
    prompt: Classify this fingerprint's authoring scenario and confirm the package validates.
---

# Recipe: Collaborative Fingerprint Authoring

**Goal:** help a human and agent co-author durable brand truths through
conversation — without laundering what a codebase happens to do into what the
brand means.

The fingerprint is medium-agnostic and is not derived from a repo. Its raw
material is **elicitation**: what the human says, shows, and points at — words,
screenshots, links, exemplar products, marketing copy, a competitor they define
themselves against. Agent synthesis is draft work until the human curates it
and ordinary Git review accepts it.

Repo-bound reality — components, tokens, paths, building blocks — can be
recorded as `materials` on the node whose prose explains their purpose. When a
conversation surfaces "we have a component for that," treat it as material to
locate and interpret, not as brand truth by itself.

## 1. Start With One Repeated Decision

Do not try to fingerprint the whole brand at once. Ask the human for the one
decision whose feedback keeps repeating — the checkout always flagged for
trust, the voice always re-toned, the empty state always rewritten — and
capture that one truth as a node first. One high-confidence truth beats an
empty catalog; the fingerprint grows as the next repeated decision shows up.

The scenario below tunes the authoring *posture* for that first node; it is not
a gate to clear before writing anything.

| Scenario | Default authoring posture |
| --- | --- |
| Net new brand | Stance-first. Elicit feel, audience, and early anti-goals before anything else exists to point at. |
| Established brand, first fingerprint | Artifact-rich interview. The human can show a lot — shipped surfaces, brand docs, campaigns. Elicit which of it is *intentional*. |
| Strong opinions, weak articulation | Example-led. The human knows it when they see it: work from exemplars and counter-exemplars ("this feels like us, this never would") toward the stance underneath. |
| Brand doc or design-language deck exists | Distillation. The document is testimony, not truth: pull the claims that actually steer decisions, drop the aspirational filler, and have the human ratify each survivor. |
| Rebrand, redesign, migration | Transition-led. Capture current, target, and what must not be lost in between. |
| Fork, white label, tenant variant | Shared base + local divergence. Keep common truths broad; scope divergence with conditions. |
| Monorepo or product suite | One contract per package. |

If more than one applies, start with the broad scenario, then narrow.

## 2. Interview The Human

The interview is the engine. Ask only high-leverage questions that change the
fingerprint:

- What should this brand feel like, and what should it never become? (The
  "never become" answers are anti-goal nodes — capture them with the same care
  as the affirmative stance.)
- Who is the audience, and what are they trying to get done?
- Which surfaces, campaigns, or moments show the brand at its best? Show me.
- Which brand or product do you admire — and where do you deliberately differ?
  (The deliberate differences also route to anti-goal nodes: the rejected
  neighbor, named.)
- What keeps getting flagged in review, re-toned, or rewritten?
- Where do trust, density, pacing, accessibility, recovery, or disclosure
  matter most?
- Which truths are universal, and which only hold under a specific situation?

Capture human-authored or human-approved answers as nodes. Do not treat
unapproved notes as canonical.

## 3. Work The Material The Human Brings

Ask for artifacts and read them closely: screenshots, links, exemplar products,
brand docs, marketing copy, past campaigns, a rejected design and why it was
rejected. Treat every artifact as *testimony* — evidence of a stance the human
holds — never as truth by itself. A pattern that appears everywhere may be
legacy; a pattern that appears once may be the brand at its best. The human
says which.

Counter-exemplars are as valuable as exemplars. "We would never ship this" with
a screenshot attached usually yields a sharper truth than an hour of
affirmative description.

## 4. Draft The Nodes

Write the smallest useful set of nodes, each a purpose-coherent prose truth with
a one-line `description`, named `<kind>.<slug>.md` (or a bare slug when no kind is present). Write each body through the intent / inventory / composition
lenses: the why, the material, and how it is assembled. These are lenses, not
fields.

Draft only what the human said or showed. State universal truths plainly; give
narrower truths a **condition** in the prose — the situation they apply in,
never a destination. Label uncertain reasoning as provisional. Prefer a few
high-confidence truths over a broad catalog.

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

- **Kind** — declare the kind vocabulary in `glossary.md` and name each node
  `<kind>.<slug>.md` so its normative weight is clear. The glossary defines what
  each kind means and how strongly it binds (the starter vocabulary reads: a
  `principle` is always-on; a `condition` is situational; an `exemplar` is
  illustrative unless the glossary says otherwise). Kinds are your choice; Ghost
  ships no fixed vocabulary.
- **Altitude** — state a truth at the level it is actually true. Universal → state
  it plainly. Narrower → name the situation that activates it, in the prose. Never
  file a truth by destination (`for-emails.md`); the model reads the condition and
  decides when it applies.

## 7. Validate And Ratify

```bash
ghost validate .ghost
```

`validate` checks artifact shape, per-node validity, and that each node's kind
prefix is a declared glossary kind (undeclared → warning with a "did you
mean" suggestion). Use ordinary Git review as the approval boundary: uncommitted
edits are drafts; checked-in nodes are canonical.

## Never

- Never derive brand truth from repo code alone; what the codebase repeats may
  be legacy, not stance. Use repo paths as `materials` only after the prose
  truth has been curated.
- Never draft a node the human neither said nor showed; that is invention
  wearing the brand's clothes.
- Never treat a brand doc, an artifact, or repetition frequency as brand
  authority; the human ratifies what is intentional.
- Never invent a hierarchy, inheritance, or edges — the package is flat.
- Never file a truth by destination; state its condition in the prose.
