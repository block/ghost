---
name: product-keeps-state-actionable
description: Operational screens preserve location, current state, and usable actions.
severity: medium
references:
  - baseline.interface.product > Rules
  - baseline.interface.product > Never
---

- Flag same-level buttons vary arbitrarily, essential mobile actions move or change labels with density, or dismissible overlays lack an exit. (`baseline.interface.product > Rules`)
- Flag disabled actions conceal a task-relevant reason, destinations are duplicated in navigation, or location and return routes are unclear. (`baseline.interface.product > Rules`)
- Flag long lists lack search/filtering, table content clips or collides, numeric columns misalign, or mobile rows lose identity, status, or their action. (`baseline.interface.product > Rules`)
- Flag the identifying table column is not widest, status and metadata columns are not compact, or rows vary arbitrarily or lose the documented touch-safe anatomy. (`baseline.interface.product > Rules`)
- Flag an empty list offers no explanation or first-record action, or summary context and meaningful change are buried. (`baseline.interface.product > Rules`)
- Flag configuration objects omit name, status, or action; every possible state appears to be current. (`baseline.interface.product > Rules`)
- Flag filters use controls that cannot express the choices, applied filters are hidden or cannot be removed in place, OR/AND combinations are unclear, or sorting is mixed into filters. (`baseline.interface.product > Rules`)
- Flag status messages are distant from their subject, duplicated, lack consequence or next step, disappear despite requiring action, or leave no permanent resulting state. (`baseline.interface.product > Rules`)
- Flag numeric filters allow only fixed buckets rather than exact values. (`baseline.interface.product > Never`)
- Flag table type drops below the documented ramp, columns overflow to fit, or full page-sections stack to depict a flow instead of a stepper or labeled page-sized variants. (`baseline.interface.product > Never`)

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
