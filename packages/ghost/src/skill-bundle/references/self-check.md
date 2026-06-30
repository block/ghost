---
name: self-check
description: A pre-generation probe that reveals whether you have actually gathered and reasoned about a surface's fingerprint, before you build or review its UI.
---

# Recipe: Self-Check Before Generating

Before writing or reviewing UI for a surface, check whether you are grounded in
its fingerprint or about to fall back on generic instincts. These questions test
your **grounding and provenance**, not the surface's contents, so they hold for
any fingerprint, however sparse, whatever the product, whoever authored it.

Ask yourself:

1. **What did you gather?** Which Ghost nodes did you pull for this surface
   (`ghost gather <surface>`), and can you cite them by id? If you have not
   gathered, you are not grounded. Gather first.
2. **What is Ghost-backed vs. provisional?** For each claim you are about to
   encode in the UI, is it backed by a gathered node (cite the id), or is it
   your own provisional local reasoning? You must be able to label every claim
   as one or the other.
3. **Where is the fingerprint silent?** What does this surface's slice not
   cover for your task, and what will carry the reasoning in those gaps? Naming
   the silence is part of being grounded; pretending coverage you do not have is
   not.

Optionally, where the prose speaks to it: if the gathered nodes say anything
about hierarchy, density, restraint, repetition, or trust, state what they say.
If they do not, that is a valid answer: record it as silence, not as a failure.

When you cannot answer 1–3:

1. Run `ghost gather` to list the node menu, or `ghost gather <query>` to rank
   the closest nodes for a term the work is about.
2. Run `ghost gather <node> --format json` to compose the slice and read the
   gathered nodes' prose.
3. Re-ask the three questions, citing node ids.

A genuinely silent fingerprint is an expected state, not a blocker. When the
slice does not cover the task, say so plainly and proceed with provisional local
reasoning when safe; label it non-Ghost-backed. Ask a human before
product-surface-defining choices.
