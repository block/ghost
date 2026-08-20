---
for: Component work needs className, inline style, arbitrary values, or a local primitive fork.
materials:
  - packages/vessel-react/scripts/audit-agent-safety.mjs
---

In this context: you are writing or reviewing Vessel component code and the
change reaches for `className` passthrough, inline `style`, arbitrary
Tailwind values, or a local fork of a primitive.

## Usage

Escape hatches are governed, not banned — Vessel is source-owned and
shadcn-compatible, so they are sometimes necessary. Whatever hatch survives
must stay easy to grep, count, and review — that visibility is the contract
that makes the hatch acceptable.

## Rules

- Reach for variants, slots, tokens, and safe primitives before `className`.
- When the same override recurs, add a named decision to Vessel (a variant,
  a token role, a prop) instead of repeating the hatch.
- Keep arbitrary values, inline styles, and raw palette utilities out of
  normal component source unless there is a documented technical reason.
- Prefer a deterministic check that can count or reject the unsafe path over
  review prose that discourages it.

## Never

- Never write a hatch in a way that is hard to grep, count, or review —
  keep the raw value visible so the override stays a named, countable
  decision.
