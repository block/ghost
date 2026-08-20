---
for: Reconciling Vessel with upstream shadcn or evaluating an upstream change.
---

In this context: you are syncing Vessel components against newer upstream
shadcn sources, or evaluating an upstream change for adoption.

## Usage

Upstream shadcn is raw material, not authority over Vessel's visual language.
Syncing is upstream hygiene, not visual direction.

## Rules

- Triage every upstream change into one of three moves: adopt, adapt, or
  reject.
- **Adopt** mechanical improvements outright: accessibility fixes, Radix
  wiring, ARIA, keyboard behavior, `data-slot` conventions, React
  compatibility, and Tailwind-4-compatible structure.
- **Adapt** useful anatomy through Vessel's token contract and component
  API — the structure can come in, but it authors against semantic roles.
- **Reject** generic visual decisions that widen the authoring surface: raw
  palette classes, arbitrary values, broad aliases, component-local theme
  hacks, or styling that bypasses Vessel's semantic roles.
- Preserve the migration order: upstream hygiene first, then the agnostic
  token contract, then Vessel's own restrained reference stance, then agent
  safety (checks, metadata, safer APIs), then selective mining of downstream
  forks.

## Never

- Never invert the migration order into "accept latest shadcn wholesale" or
  "copy a product fork" — either would erase the reason Vessel exists; triage
  each change through adopt/adapt/reject instead.
