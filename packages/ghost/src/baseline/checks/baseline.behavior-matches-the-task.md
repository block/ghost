---
name: behavior-matches-the-task
description: Interactive behavior, state, layering, and motion match the task.
severity: medium
references:
  - baseline.fundamentals.craft > Rules
  - baseline.fundamentals.craft > Never
---

- Flag truncation removes task-critical content with no route to the complete content. (`baseline.fundamentals.craft > Rules`)
- Flag an element looks actionable but does nothing, an enterable task state is absent or indistinguishable, recoverable work is lost, or recovery has no plain next step. (`baseline.fundamentals.craft > Rules`)
- Flag a high-stakes action offers no review or confirmation explaining what will happen. (`baseline.fundamentals.craft > Rules`)
- Flag static work invents application states the requested moment does not need. (`baseline.fundamentals.craft > Rules`)
- Flag several actions share priority in a single-action decision region. (`baseline.fundamentals.craft > Rules`)
- Flag content paints above navigation, overlays, or dialogs contrary to the declared layering values. (`baseline.fundamentals.craft > Rules`)
- Flag motion communicates no state, continuity, or cause, or repetition explains no task-specific change. (`baseline.fundamentals.craft > Rules`)
- Flag extreme z-index values mask a broken stacking structure, or decorative pulse, float, shimmer, bounce, wobble, or uniform fade-and-rise communicates no state, continuity, or cause. (`baseline.fundamentals.craft > Never`)

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
