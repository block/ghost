---
name: email-survives-client-fallbacks
description: The message and action survive email-client limitations.
severity: high
references:
  - baseline.interface.email > Rules
---

- Flag the body depends on flexbox, grid, or an external stylesheet to remain usable. (`baseline.interface.email > Rules`)
- Flag the hidden preheader is misplaced, repeats the subject, or subject, preheader, and heading lack distinct roles. (`baseline.interface.email > Rules`)
- Flag the subject and first sentence omit the recipient’s gain, action, or consequence, or competing CTA identities appear. (`baseline.interface.email > Rules`)
- Flag the CTA fails in a supported client, or the fallback font stack loses heading/body hierarchy. (`baseline.interface.email > Rules`)
- Flag images lack explicit column widths or background fallbacks, or Outlook must render CSS background images for the message to work. (`baseline.interface.email > Rules`)
- Flag appearance modes rely on client inversion, or mobile reflow loses the hierarchy or CTA. (`baseline.interface.email > Rules`)

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
