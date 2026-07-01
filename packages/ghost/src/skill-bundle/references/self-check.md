---
name: self-check
description: A pre-generation probe that reveals whether you have actually gathered and reasoned about the brand fingerprint, before you build.
---

# Recipe: Self-Check Before Generating

Before writing UI, copy, email, or any output, check whether you are grounded in
the fingerprint or about to fall back on generic instincts. These questions test
your **grounding and provenance**, not the fingerprint's contents, so they hold
for any fingerprint, however sparse, whatever the medium, whoever authored it.

Ask yourself:

1. **What did you gather?** Which Ghost nodes did you pull for this task (from
   `ghost gather`), and can you cite them by id? If you have not gathered, you
   are not grounded. Gather first.
2. **What is Ghost-backed vs. provisional?** For each claim you are about to
   encode, is it backed by a gathered node (cite the id), or is it your own
   provisional local reasoning? You must be able to label every claim as one or
   the other.
3. **Do the conditions apply?** For each conditional truth you pulled, does its
   stated situation actually hold for this task? A `condition` node fires only
   when its situation holds; do not apply it where it does not, and do not ignore
   it where it does.
4. **Where is the fingerprint silent?** What does the fingerprint not cover for
   your task, and what will carry the reasoning in those gaps? Naming the silence
   is part of being grounded; pretending coverage you do not have is not.

When you cannot answer 1–4:

1. Run `ghost gather` to emit the menu, then match the work to nodes by their
   descriptions.
2. Read the selected nodes' bodies and re-ask the questions, citing node ids.

A genuinely silent fingerprint is an expected state, not a blocker. When it does
not cover the task, say so plainly and proceed with provisional local reasoning
when safe; label it non-Ghost-backed. Ask a human before high-risk or
brand-defining choices.
