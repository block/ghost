---
name: authoring-scenarios
description: Choose the right human-agent workflow for authoring ghost packages.
handoffs:
  - label: Validate the package
    command: ghost validate --format json
    prompt: Classify this package's authoring scenario and confirm the package validates.
---

# Recipe: Collaborative Package Authoring

**Goal:** help a human and agent co-author durable brand guidance through
conversation — without laundering what a codebase happens to do into what the
brand means.

The ghost package is medium-agnostic and is not derived from a repo. Its raw
material is **elicitation**: what the human says, shows, and points at — words,
screenshots, links, exemplar products, marketing copy, a competitor they define
themselves against. Agent synthesis is draft work until the human curates it
and ordinary Git review accepts it.

Repo-bound reality — components, tokens, paths, building blocks — can be
recorded as `materials` on the node whose prose explains their purpose. When a
conversation surfaces "we have a component for that," treat it as material to
locate and interpret, not as brand guidance on its own.

## 1. Start With One Repeated Decision

Do not try to capture the whole brand at once. Ask the human for the one
decision whose feedback keeps repeating — the checkout always flagged for
trust, the voice always re-toned, the empty state always rewritten — and
capture that one decision as a node first. One well-grounded node beats an
empty catalog; the package grows as the next repeated decision shows up.

The scenario below tunes the authoring *posture* for that first node; it is not
a gate to clear before writing anything.

| Scenario | Default authoring posture |
| --- | --- |
| Net new brand | Stance-first. Elicit feel, audience, and early anti-goals before anything else exists to point at. |
| Established brand, first ghost package | Artifact-rich interview. The human can show a lot — shipped surfaces, brand docs, campaigns. Elicit which of it is *intentional*. |
| Strong opinions, weak articulation | Example-led. The human knows it when they see it: work from exemplars and counter-exemplars ("this feels like us, this never would") toward the stance underneath. |
| Brand doc or design-language deck exists | Distillation. Treat the document as evidence: pull the claims that actually steer decisions, drop the aspirational filler, and have the human ratify each survivor. |
| Rebrand, redesign, migration | Transition-led. Capture current, target, and what must not be lost in between. |
| Fork, white label, tenant variant | Shared base + local divergence. Keep shared guidance broad; scope divergence with conditions. |
| Monorepo or product suite | One contract per package. |

If more than one applies, start with the broad scenario, then narrow.

## 2. Interview The Human

The interview is the engine. Ask only high-leverage questions that change the
guidance:

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
- Which guidance is universal, and which guidance holds only under a specific situation?

Capture human-authored or human-approved answers as nodes. Do not treat
unapproved notes as canonical.

## 3. Work The Material The Human Brings

Ask for artifacts and read them closely: screenshots, links, exemplar products,
brand docs, marketing copy, past campaigns, a rejected design and why it was
rejected. Treat every artifact as *testimony* — evidence of a stance the human
holds — never as guidance by itself. A pattern that appears everywhere may be
legacy; a pattern that appears once may be the brand at its best. The human
says which.

Counter-exemplars are as valuable as exemplars when they name the replacement.
"We would never ship this; we would ship that instead" with artifacts attached
usually yields a sharper anti-goal than an hour of affirmative description. Avoid
blacklist-only anti-goals: the rejected pattern should be purged from exemplars
and enforced in review, not repeated as the model's main example.

## 4. Draft The Nodes

Write the smallest useful set of nodes, each carrying purpose-coherent prose guidance with
a one-line `description`, named `<kind>.<slug>.md` (or a bare slug when no kind is present). Ask three questions of each node body: why (the stance), with what
(the materials), and how it is assembled (the patterns). These are drafting
prompts, not fields.

Draft only what the human said or showed. State universal guidance plainly; give
narrower guidance a **condition** in the prose — the situation they apply in,
never a destination. Label uncertain reasoning as provisional. Prefer a few
focused guidance over a broad catalog. Hold draft prose to the node prose
stances in [capture.md](capture.md) and score each node against its drafting
gate before presenting drafts for curation.

## 5. Curate With The Human

Before treating draft content as durable, ask the human to classify important
claims:

- keep as canonical
- soften the guidance
- reject as accidental or legacy
- move to scratch notes
- restate at a broader or narrower altitude (add or drop a condition)

## 6. Decide Kinds And Altitude

Two authoring decisions replace any notion of hierarchy:

- **Kind** — declare the kind vocabulary in `glossary.md` and name each node
  `<kind>.<slug>.md` so its normative weight is clear. The glossary defines what
  each kind means and how strongly it binds. Kinds are your choice;
  ghost ships no fixed vocabulary.
- **Altitude** — state guidance at the level where it applies. Universal → state
  it plainly. Narrower → name the situation that activates it, in the prose. Never
  file a node by destination (`for-emails.md`); the model reads the condition and
  decides when it applies.

## 7. Validate And Ratify

```bash
ghost validate .ghost
```

`validate` checks artifact shape, per-node validity, and that each node's kind
prefix is a declared glossary kind (undeclared → warning with a "did you
mean" suggestion). Use ordinary Git review as the approval boundary: uncommitted
edits are drafts; checked-in nodes are canonical.

## Shapes Of A Useful Node

The shapes below teach what steering prose looks like when it works. The
examples use **Morrow Ledger**, a fictional bookkeeping product — teaching
fiction for this recipe only, never content for a real corpus. Each shape is a
pattern to imitate with the human's real guidance.

- **Stance as forced choices.** Not adjectives — decisions under pressure:
  "Clarity beats momentum: write '3 invoices are 14+ days late', not 'Cash
  flow needs attention.'" A stance earns its place when it rejects a plausible
  wrong answer.
- **Composition floor.** Hard invariants with numbers, holding unless a
  narrower condition says otherwise: "Maximum three figures above the fold —
  if there are four, demote one into details instead of shrinking type."
- **Anti-goal as not-X-instead-Y.** The rejected default *and* its committed
  replacement: "Not 'Revenue is up 24% 🎉' — instead 'July receipts are $4,820
  higher than June; 2 invoices explain most of the change.'" A bare ban prunes
  one path; the replacement commits another.
- **Pattern as bound/open.** Say what is decided and what remains free:
  "Bound: status line first, one sentence, ≤11 words; one primary next step
  last. Open: evidence may be a table row or a two-item list." All bound is a
  template; nothing bound is vibes.
- **Annotated exemplar.** A concrete reference plus what it is normative for
  and what is incidental: "Copy the square edge, measured evidence, and action
  cost. Do not copy the exact amounts or dates." An unannotated exemplar
  teaches its accidents as brand.
- **Material inventory.** `materials` locates; prose explains meaning:
  "`src/styles/tokens.css` should define the ink, ledger, amber, and paper
  colors." Never duplicate API docs unless the API itself is the brand guidance.
- **Decision trace.** A worked tradeoff with the reversal condition: "We chose
  visible evidence over shorter surfaces… Reverses when the evidence would
  expose sensitive third-party details — then show the count only." Models
  imitate reasoning as well as outputs.

State the silence posture on the manifest-declared cover, which `gather`
inlines for every task: when the package is silent, proceed provisionally
from local conventions only when safe, and ask before brand-defining,
irreversible, legal, privacy-sensitive, or high-risk choices.

## Never

- Never derive brand guidance from repo code alone; what the codebase repeats may
  be legacy, not stance. Use repo paths as `materials` only after the prose
  guidance has been curated.
- Never draft a node the human neither said nor showed; that is invention
  wearing the brand's clothes.
- Never treat a brand doc, an artifact, or repetition frequency as brand
  authority; the human ratifies what is intentional.
- Never invent a hierarchy, inheritance, or edges — the package is flat.
- Never file a node by destination; state its condition in the prose.
