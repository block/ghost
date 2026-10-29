---
name: accessibility-is-preserved
description: Applicable accessibility requirements remain satisfied.
severity: high
references:
  - baseline.fundamentals.accessibility > Rules
  - baseline.fundamentals.accessibility > Never
---

- Flag an applicable WCAG 2.2 Level A or AA criterion, or platform-equivalent requirement, is unmet. (`baseline.fundamentals.accessibility > Rules`)
- Flag structure or reading order is unavailable programmatically, names or states are missing, or repeated content cannot be bypassed. (`baseline.fundamentals.accessibility > Rules`)
- As a default, flag unnecessary replacement of native semantics with ARIA unless explicit guidance replaces this default. (`baseline.fundamentals.accessibility > Rules`)
- Flag text contrast falls below 4.5:1, large-text contrast below 3:1, or meaningful components and graphics below 3:1; color alone conveys meaning. (`baseline.fundamentals.accessibility > Rules`)
- Flag content is lost at 200% text resize, WCAG text-spacing overrides, or 320 CSS pixel reflow; orientation is needlessly locked or overlays obscure content and actions. (`baseline.fundamentals.accessibility > Rules`)
- Flag an action cannot be completed by keyboard, focus is trapped or hidden, modal focus escapes, or focus does not move or return logically. (`baseline.fundamentals.accessibility > Rules`)
- Flag input requires gestures, dragging, motion, or pointer-down commitment without the applicable simpler alternative or cancellation. (`baseline.fundamentals.accessibility > Rules`)
- Flag targets miss the 24 by 24 CSS pixel requirement without an allowed exception. (`baseline.fundamentals.accessibility > Rules`)
- Flag custom primary touch targets fall below the 44 by 44 CSS pixel default without documented platform sizing or an explicit replacement default. (`baseline.fundamentals.accessibility > Rules`)
- Flag labels, image alternatives, language identification, or input guidance are absent; errors lack known correction guidance; entered values are lost; or commitments cannot be reviewed and corrected. (`baseline.fundamentals.accessibility > Rules`)
- Flag authentication depends on an unsupported cognitive test, or a process unnecessarily requests the same information again. (`baseline.fundamentals.accessibility > Rules`)
- Flag motion lacks a reduced alternative or required control, flashing exceeds three times per second above WCAG thresholds, or time limits lack required warnings or adjustment. (`baseline.fundamentals.accessibility > Rules`)
- Flag required media alternatives are absent, hover content cannot be dismissed or reached, status changes are not announced, or repeated navigation and help change unexpectedly. (`baseline.fundamentals.accessibility > Rules`)
- Flag authentication blocks password managers or paste. (`baseline.fundamentals.accessibility > Never`)

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
**Default review method.** Treat automated results as evidence, not proof; include applicable keyboard, screen-reader, zoom, reflow, motion, and content review. Review methods may be replaced; applicable accessibility requirements may not.
