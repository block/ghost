---
name: component-integrity
description: Component changes avoid variant sprawl, parallel forks, hierarchy violations, and product guidance hardening into the shared layer.
severity: medium
references:
  - pattern.controls
  - principle.named-decisions
  - principle.reference-not-brand
---

These flags guard the shared component set as work builds on it. Flag:

- more than one primary-variant button per view: secondary actions step
  down to `secondary`, `outline`, `ghost`, or `link`; if two actions
  genuinely compete, the hierarchy needs a decision, not two primaries;
- new variants or props added to a shared component without evidence of
  repeated need (a second or third call site wanting the same thing): one
  screen's need is a call-site composition, not a new variant in the shared
  set;
- long ad-hoc `className` strings at call sites that reimplement an existing
  variant (a hand-rolled outline button, a re-padded card): recommend the
  existing variant, or promoting the pattern if it truly is new;
- copies of shared components (`button-v2.tsx`, `custom-dialog.tsx`) that
  fork instead of composing: wrappers that compose are fine; parallel forks
  split the system;
- product-specific copy, business flows, or app-only assumptions hardcoded
  into the shared `ui/` or `ai-elements/` layer as if universal;
- interactive elements missing their accessibility contract when the shared
  component provided one: focus-visible rings removed, `aria-invalid` wiring
  dropped from forms, dialogs without titles: the contract shipped working;
  a diff should not un-ship it.
