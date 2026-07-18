---
name: self-check
description: A pre-generation probe that reveals whether you have actually gathered and reasoned about the brand guidance, before you build.
---

# Recipe: Self-Check Before Generating

Before writing UI, copy, email, or any output, check whether you are grounded in
the guidance or about to fall back on generic instincts. These questions test
your **grounding and provenance**, not the package's contents, so they hold
for any ghost package, however sparse, whatever the medium, whoever authored it.

Ask yourself:

1. **What did you gather?** Which ghost nodes did you pull for this task (from
   `ghost gather`), and can you cite them by id? If you have not gathered, you
   are not grounded. Gather first.
2. **What is ghost-backed vs. provisional?** For each claim you are about to
   encode, is it backed by a gathered node (cite the id), or is it your own
   provisional local reasoning? You must be able to label every claim as one or
   the other.
3. **Do the conditions apply?** For each conditional node you pulled, does its
   stated situation actually hold for this task? For each kind with conditional
   or scoped meaning **per the glossary**, apply it only when its stated
   situation holds; do not apply it where it does not, and do not ignore it
   where it does.
4. **Where is the package silent?** What does the package not cover for
   your task, and what will carry the reasoning in those gaps? Naming the silence
   is part of being grounded; pretending coverage you do not have is not.

## Steering readiness

Before generating, can you cite:

- the governing principle, stance, or tradeoff?
- the concrete materials, if exactness matters?
- the applicable pattern, if structure matters?
- the relevant exemplar and what it is normative for?
- the anti-goal that blocks the generic version?
- the hard invariants?
- the conditions that apply or do not apply?
- any decision trace for ambiguous tradeoffs?
- where the package is silent?

Classify readiness:

- **Green:** enough ghost-backed guidance and concrete material for this surface
  to generate.
- **Yellow:** generation is safe, but some reasoning must be labeled
  provisional; if there is no concrete material for this surface, readiness is
  at most Yellow.
- **Red:** missing brand-defining, high-risk, or irreversible guidance; ask a
  human or author a node first.

When you cannot answer the grounding questions:

1. Run `ghost gather <ask>` to emit the menu for the actual task, then match the
   work to nodes by their descriptions.
2. Read the selected nodes' bodies and re-ask the questions, citing node ids.

A genuinely silent package is an expected state, not a blocker. When it does
not cover the task, say so plainly and proceed with provisional local reasoning
when safe; label it non-ghost-backed. If the package's cover declares a stricter
silence posture, honor it over this default. Ask a human before
high-risk or brand-defining choices.
