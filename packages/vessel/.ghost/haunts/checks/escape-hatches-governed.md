---
name: escape-hatches-governed
description: New escape hatches in component source are justified, minimal, and visible.
severity: medium
references:
  - condition.escape-hatches
  - principle.named-decisions
---

Grade whether the change follows the escape-hatch policy in
`condition.escape-hatches`. Flag:

- arbitrary Tailwind values, inline `style`, or raw palette utilities in
  normal component source without a documented technical reason;
- an override pattern that already recurs elsewhere and should become a named
  variant, token role, or prop instead of another hatch;
- hatches written in a way that is hard to grep or count (dynamic class
  construction that hides the raw value).
