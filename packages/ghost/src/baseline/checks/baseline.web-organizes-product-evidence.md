---
name: web-organizes-product-evidence
description: Public pages connect audience outcomes to visible product evidence.
severity: medium
references:
  - baseline.interface.web > Rules
  - baseline.interface.web > Never
---

- Flag product evidence does not support the leading outcome, or expression makes facts, terms, and actions hard to find. (`baseline.interface.web > Rules`)
- Flag navigation and footer dominate content, or background changes imply no new subject. (`baseline.interface.web > Rules`)
- Flag comparable prices or specifications are scattered outside tables, or a prominent figure lacks a reading-size label. (`baseline.interface.web > Rules`)
- Flag an FAQ becomes a card grid, full-width sections lose inner horizontal margins, or unavailable photography is replaced by unsupported product imagery. (`baseline.interface.web > Rules`)
- Flag a generic section sequence overrides the actual content, decorative stock fills space, or a fake dashboard stands in for the real product. (`baseline.interface.web > Never`)

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
