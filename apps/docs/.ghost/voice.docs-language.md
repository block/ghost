---
description: ghost docs voice and vocabulary — gather before writing docs copy, headings, onboarding text, CLI examples, or product explanations.
materials:
  - apps/docs/src/content/docs/*.mdx
  - apps/docs/src/app/page.tsx
  - apps/docs/src/app/docs/page.tsx
  - apps/docs/src/app/tools/**/*.tsx
---

ghost docs should sound like an opinionated tool builder explaining a sharp
model, not like a launch page selling a platform.

Voice rules:

- Lead with the user's repeated pain: the same review comment, the same drift,
  the same missing decision. Then show the small move ghost makes possible.
- Prefer short declarative sentences around the model: "The CLI does the
  deterministic work; your agent does the interpretation." Do not bury the
  boundary in hedging.
- Use concrete artifact names: `.ghost/`, `manifest.yml`, `glossary.md`, the
  manifest-declared cover, `checks/`, `ghost gather`, `ghost pull`. The docs earn
  trust by naming the files and commands agents actually touch.
- Say **ghost**, **`.ghost/` package**, **brand guidance**, **node**,
  **kind**, **materials**, **feed-forward**, **feed-back**, and **advisory review packet**
  consistently. Do not introduce synonyms such as brand DNA, style cache,
  design brain, magic layer, or guardrail engine.
- Explain by contrast: feed-forward versus feed-back, deterministic CLI versus
  interpretive agent, flat corpus versus traversal, evidence versus ratified guidance,
  draft versus canonical.
- Keep the claim plain when the idea is abstract. A good ghost sentence should
  make a wrong implementation less likely, not merely sound clever.

Copy anti-patterns:

- No "unlock," "supercharge," "seamless," "delightful," "AI-powered," or
  "world-class" filler.
- No exclamation points in instructional copy.
- No anthropomorphizing ghost as the judge or designer. The agent judges; ghost
  assembles context and packets.
- No broad promises that ghost preserves a whole brand automatically. It only
  preserves what the selected guidance makes readable and reviewable.
