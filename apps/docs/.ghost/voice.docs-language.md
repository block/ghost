---
description: ghost docs voice and vocabulary — gather before writing docs copy, headings, onboarding text, CLI examples, or product explanations.
materials:
  - apps/docs/src/content/docs/*.mdx
  - apps/docs/src/app/page.tsx
  - apps/docs/src/app/docs/page.tsx
  - README.md
  - packages/ghost/README.md
---

ghost docs should sound like an opinionated tool builder explaining a sharp
model, not like a launch page selling a platform.

Voice rules:

- Lead with the user's repeated pain: the same review comment, the same drift,
  the same missing decision. Then show the small move ghost makes possible.
- Put the agent interaction first: the `.ghost/` package holds guidance, the
  agent selects and applies it, and the CLI handles repeatable support work.
  Name CLI mechanics only when they help someone use or understand a command.
- Use concrete artifact names: `.ghost/`, `manifest.yml`, `glossary.md`, the
  manifest-declared cover, `checks/`, `ghost gather`, `ghost pull`. The docs earn
  trust by naming the files and commands agents actually touch.
- Say **ghost**, **`.ghost/` package**, **brand guidance**, **node**,
  **kind**, and **materials** consistently. Use **review evidence** when the
  packet format itself is not relevant. Do not introduce synonyms such as brand
  DNA, style cache, design brain, magic layer, or guardrail engine.
- Prefer direct explanations of what happens before and after making. Reserve
  terms such as **feed-forward**, **feed-back**, and **deterministic** for
  technical passages where the distinction changes behavior.
- Keep the claim plain when the idea is abstract. A good ghost sentence should
  make a wrong implementation less likely, not merely sound clever.
- Use contrast only when it prevents a real misunderstanding. Do not stack
  "X, not Y" constructions or end sections by restating the point as an
  aphorism.
- Name the actor. Humans author and approve guidance; agents interpret and make;
  CLI commands return menus, nodes, validation results, and review evidence.
- Do not use em dashes.

Copy anti-patterns:

- Do not turn architecture into a slogan. Avoid declaring that the package,
  packet, CLI, or ghost itself "is the product," and avoid courier, machinery,
  engine, or layer metaphors in user-facing explanations.
- Do not leak implementation names such as Skeletons, event tapes, cliche floors,
  or signature dials before the docs define them.
- No "unlock," "supercharge," "seamless," "delightful," "AI-powered," or
  "world-class" filler.
- No exclamation points in instructional copy.
- No anthropomorphizing ghost as the judge, designer, or author. The agent
  interprets the guidance and makes the work; CLI commands supply menus, nodes,
  validation results, and review evidence.
- No broad promises that ghost preserves a whole brand automatically. It only
  preserves what the selected guidance makes readable and reviewable.
