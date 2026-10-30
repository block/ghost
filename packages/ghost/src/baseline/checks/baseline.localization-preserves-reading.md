---
name: localization-preserves-reading
description: Responsive and localized work preserves readable hierarchy and order.
severity: high
references:
  - baseline.fundamentals.typesetting > Rules
  - baseline.fundamentals.typesetting > Never
  - baseline.fundamentals.composition > Rules
  - baseline.fundamentals.composition > Never
  - baseline.fundamentals.accessibility > Rules
  - baseline.fundamentals.accessibility > Never
---

- Inspect required writing systems, local conventions, real translated text, and rebroken headlines. Flag English assumptions applied mechanically or utility styles without a meaningful role. (`baseline.fundamentals.typesetting > Rules`; `baseline.fundamentals.typesetting > Never`)
- Compare responsive and expanded-copy variants; flag uniform shrinking, broken relationships, or lost hierarchy. When variants are unavailable, report the verification gap rather than claiming a pass. (`baseline.fundamentals.composition > Rules`; `baseline.fundamentals.composition > Never`)
- Inspect reading direction, glyph support, essential-text collisions, and localized reflow against the perception floor. (`baseline.fundamentals.accessibility > Rules`; `baseline.fundamentals.accessibility > Never`)
