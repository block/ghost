---
name: email-survives-client-fallbacks
description: The message and action survive email-client limitations.
severity: high
references:
  - baseline.interface.email > Rules
  - baseline.interface.email > Never
  - baseline.fundamentals.composition > Rules
---

- Inspect actual supported-client renders, including degraded content, against `baseline.interface.email > Never`. Flag a failure of the fallback criteria; report missing client evidence separately from a demonstrated pass.
- Compare subject, preheader, message, action, font fallback, hosted imagery, and appearance-mode evidence with `baseline.interface.email > Rules`. Flag mismatches with those email criteria; a source declaration alone does not demonstrate a client render.
- Compare mobile renders with `baseline.fundamentals.composition > Rules` for hierarchy and relationships, and `baseline.interface.email > Rules` for the action. Pass only the variants actually inspected.
