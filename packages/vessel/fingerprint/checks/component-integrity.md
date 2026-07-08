---
name: Component integrity
description: Flags variant sprawl, one-off forks of vendored components, hierarchy violations, and app truth hardening into the shared UI layer.
severity: medium
references:
  - primitive.controls
  - contract.tokens
  - index
---

These flags guard the vendored component set as this repo builds on it.

Flag more than one primary-variant button per view. Secondary actions step
down to `secondary`, `outline`, `ghost`, or `link`. If two actions genuinely
compete, the hierarchy needs a decision, not two primaries.

Flag new variants or props added to a vendored component without evidence of
repeated need — a second or third call site wanting the same thing. One
screen's need is a `className` at the call site or a local composition, not
a new variant in the shared set.

Flag long ad-hoc `className` strings at call sites that reimplement an
existing variant (a hand-rolled outline button, a re-padded card). Recommend
the existing variant, or promoting the pattern if it truly is new.

Flag copies of vendored components (`button-v2.tsx`, `custom-dialog.tsx`)
that fork instead of composing. Wrappers that compose are fine; parallel
forks split the system.

Flag product-specific copy, business flows, or app-only assumptions being
hardcoded into the shared `ui/` or `ai-elements/` layer as if universal.
Product truth belongs in app-level components and this repo's own
fingerprint nodes, not in the reference layer.

Flag interactive elements missing their accessibility contract when the
vendored component provided one: focus-visible rings removed, `aria-invalid`
wiring dropped from forms, dialogs without titles. The contract shipped
working; a diff should not un-ship it.
