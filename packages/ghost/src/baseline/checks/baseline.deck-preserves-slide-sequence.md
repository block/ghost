---
name: deck-preserves-slide-sequence
description: Slide composition and live behavior preserve the story.
severity: medium
references:
  - baseline.interface.deck > Rules
  - baseline.interface.deck > Never
---

- Flag slides abandon the deck grid or alignment axis, lack a narrative job, or repeat a single composition regardless of the story. (`baseline.interface.deck > Rules`)
- Flag recurring labels add filler, or slide text leaves normal flow and margins without the allowed page-element role. (`baseline.interface.deck > Rules`)
- Flag imagery adds no evidence or pacing, or expressive composition obscures evidence or the next decision. (`baseline.interface.deck > Rules`)
- Flag a product pitch omits its mechanism, relevant trust risks, or next decision. (`baseline.interface.deck > Rules`)
- Flag a live presentation shows more than one active slide, lacks usable forward/back navigation, or leaves the active slide smaller than the viewport. (`baseline.interface.deck > Rules`)
- Flag viewport or aspect-ratio changes distort slide content or prevent it from reflowing. (`baseline.interface.deck > Rules`)
- Flag player controls reserve permanent space beside the slide or offset it. (`baseline.interface.deck > Rules`)
- Flag a process is shown as numbered rows without its actual direction, dependencies, stages, timeline, or repetition; flag numbers or unlabeled icons that communicate no meaning. (`baseline.interface.deck > Rules`)
- Flag primary evidence loses space to supporting media, or a diagram is crowded by labels or a headline that merely repeats its meaning. (`baseline.interface.deck > Rules`)
- Flag a captured or exported slide has no fixed frame matching the task or documented brand default, or player controls appear in that frame. (`baseline.interface.deck > Rules`)
- Flag truncated slide content has no complete version on a following slide, in an appendix, or through a cited source. (`baseline.interface.deck > Rules`)
- Flag evidence citations are hard to find, data sources lack direct attribution, or unnecessary slides repeat a demonstration or spoken point. (`baseline.interface.deck > Rules`)
- Flag live slides form a scrolling document, or images are required where a type-led slide better supports the content. (`baseline.interface.deck > Never`)
- Flag a decorative stage, shadowed card, or inset frame surrounds the slide, or type is shrunk, overflow hidden, or elements layered merely to force content into the frame. (`baseline.interface.deck > Never`)

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
