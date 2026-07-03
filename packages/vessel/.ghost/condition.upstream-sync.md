---
description: When reconciling with latest upstream shadcn — adopt mechanics, adapt anatomy, reject generic visual decisions.
---

Condition: you are syncing Vessel components against newer upstream shadcn
sources, or evaluating an upstream change for adoption.

Upstream shadcn is raw material, not authority over Vessel's visual language.
Syncing is upstream hygiene, not visual direction. Triage every upstream
change into one of three moves:

1. **Adopt** mechanical improvements outright: accessibility fixes, Radix
   wiring, ARIA, keyboard behavior, `data-slot` conventions, React
   compatibility, and Tailwind-4-compatible structure.
2. **Adapt** useful anatomy through Vessel's token contract and component
   API — the structure can come in, but it authors against semantic roles.
3. **Reject** generic visual decisions that widen the authoring surface: raw
   palette classes, arbitrary values, broad aliases, component-local theme
   hacks, or styling that bypasses Vessel's semantic roles.

The migration order to preserve: upstream hygiene first, then the agnostic
token contract, then Vessel's own restrained reference stance, then agent
safety (checks, metadata, safer APIs), then selective mining of downstream
forks. Never invert this into "accept latest shadcn wholesale" or "copy a
product fork" — either would erase the reason Vessel exists.
