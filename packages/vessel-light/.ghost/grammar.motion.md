---
description: "Motion doctrine — motion is evidence of state change, never decoration; a closed vocabulary of three duration roles and one ease; gather for any transition, animation, or hover treatment."
materials:
  - materials/tokens.css
  - "**/*.css"
  - "**/*.html"
---

Motion is evidence of a state change. It confirms hover, press, reveal,
collapse, entrance, exit, and spatial movement. It does not entertain.

The entire vocabulary is three duration roles and one ease. Fast is for hover
and press. Normal is for reveals, fades, and small state changes. Slow is
reserved for spatial transitions where the user needs to understand movement.
Do not introduce novelty easings because a surface feels static; the ease's
character is a brand answer — see the temperature signature.

Nothing loops except explicit loading states. A spinner may continue because
work continues. Decorative pulsing, floating, glowing, and attention-seeking
keyframes are off-language.

Prefer opacity and small transform changes. If removing an animation does not
reduce comprehension, the animation was decoration.

Condition: editorial surfaces may stage entrances — scroll reveals and
section transitions are part of editorial rhythm, still built from the three
durations and the one ease. In product UI the same staging is decoration.
