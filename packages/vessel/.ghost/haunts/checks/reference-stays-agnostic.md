---
name: reference-stays-agnostic
description: Vessel changes stay reference-agnostic — no product brand truth, chrome, or licensed fonts leak in.
severity: high
references:
  - principle.reference-not-brand
---

Grade whether the change keeps Vessel an agnostic reference body per
`principle.reference-not-brand`. Flag:

- product-specific flows, copy, trust obligations, or business intent encoded
  into components, tokens, or registry metadata;
- app chrome, desktop-shell assumptions, or product surfaces copied wholesale
  from a downstream fork;
- a brand or licensed font requirement introduced without an explicit
  distribution decision;
- baseline styling that trades the restrained, workbench-like default for a
  specific product's look.
