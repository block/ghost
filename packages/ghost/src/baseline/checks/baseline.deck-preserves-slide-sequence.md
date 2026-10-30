---
name: deck-preserves-slide-sequence
description: Slide composition and live behavior preserve the story.
severity: medium
references:
  - baseline.interface.deck > Rules
  - baseline.interface.deck > Never
  - baseline.fundamentals.composition > Rules
  - baseline.fundamentals.production > Rules
---

- Walk through the slide sequence and its intended delivery alongside `baseline.interface.deck > Rules`. Flag narrative jobs, evidence, pacing, or citations that fail those criteria; use the actual story to judge the sequence.
- Compare related slide layouts and viewport variants against `baseline.fundamentals.composition > Rules`. Flag failed shared relationships; distinguish a missing variant from an observed failure.
- Exercise live navigation and compare exported frames with `baseline.interface.deck > Rules` and `baseline.interface.deck > Never`. Inspect slide bounds, player behavior, and the resulting capture rather than assuming source code proves delivery.
- Review final-size reproduction evidence against `baseline.fundamentals.production > Rules`; identify any viewing condition that remains unverified.
