---
description: When component work needs className, inline style, or arbitrary values — the governed escape-hatch path.
materials:
  - packages/vessel/scripts/audit-agent-safety.mjs
---

Condition: you are writing or reviewing Vessel component code and the change
reaches for `className` passthrough, inline `style`, arbitrary Tailwind
values, or a local fork of a primitive.

Escape hatches are governed, not banned — Vessel is source-owned and
shadcn-compatible, so they are sometimes necessary. In order of preference:

1. Reach for variants, slots, tokens, and safe primitives before `className`.
2. When the same override recurs, add a named decision to Vessel (a variant,
   a token role, a prop) instead of repeating the hatch.
3. Keep arbitrary values, inline styles, and raw palette utilities out of
   normal component source unless there is a documented technical reason.
4. Whatever hatch survives must stay easy to grep, count, and review — that
   visibility is the contract that makes the hatch acceptable.

Prefer a deterministic check that can count or reject the unsafe path over
review prose that discourages it.
