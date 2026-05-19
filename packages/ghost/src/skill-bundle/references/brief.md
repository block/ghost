---
name: brief
description: Shape a pre-generation brief from the Ghost fingerprint.
---

# Brief From The Ghost Fingerprint

Use this before generating or implementing UI. The goal is to help the human and
agent understand the experience problem, not just load style constraints.

## Steps

1. Run the recall workflow for the requested task.
2. Identify the likely map scope, surface type, and composition pattern.
3. Name the product-experience decisions at stake.
4. Call out risks: accidental drift, incomplete fingerprint context, or intentional change.
5. Write prompt material for the generator or implementation agent.

## Output

Produce:

- Task framing.
- Relevant fingerprint context with citations.
- Decisions the human should make before generation.
- Product-native generation guidance.
- Drift checks to run afterward.

Do not invent fingerprint context. If context is missing, say what proposal
should be recorded after the work.
