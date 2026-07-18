---
name: Motion restraint
description: Flags non-token motion, looping decoration, and keyframes that do not explain state change.
severity: medium
references:
  - grammar.motion
  - signature.temperature
---

Review changed transitions and animations for vocabulary first.

Flag durations that do not use `--duration-fast`, `--duration-normal`, or `--duration-slow`. A hard-coded millisecond value is a drift even when it matches the token today.

Flag custom easing unless it uses the package's one ease or a browser default already required by the primitive.

Flag looping animations outside explicit loading states. Loading must be tied to ongoing work, not ambient motion.

Flag decorative keyframes: glow, float, shimmer, bounce, pulse, parallax, or any motion that can be removed without making a state change harder to understand.

Recommend the smallest opacity or transform transition that explains the state change.
