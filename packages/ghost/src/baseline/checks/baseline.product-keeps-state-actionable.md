---
name: product-keeps-state-actionable
description: Operational screens preserve location, current state, and usable actions.
severity: medium
references:
  - baseline.interface.product > Rules
  - baseline.interface.product > Never
---

- Exercise the task with representative records and compare navigation, current state, actions, and messages against `baseline.interface.product > Rules`. Flag a failed criterion; report inaccessible test states as unverified.
- Inspect dense and narrow views, tables, and active collection controls against `baseline.interface.product > Rules`. Compare their observed behavior with the supplied criteria rather than accepting their labels as proof.
- Inspect alternative-state presentations and control behavior against `baseline.interface.product > Never`. Flag the prohibited outcomes; pass only the variants and interactions actually reviewed.
