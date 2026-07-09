---
description: "The closed hierarchy vocabulary — six text variants, seven tones, a five-rung control emphasis ladder, one primary per view — gather for any view that contains text or actions."
materials:
  - materials/primitives.css
  - materials/ref/composition.form.html
  - "**/*.html"
  - "**/*.css"
---

Hierarchy is a closed vocabulary, not a size slider. Every piece of text and
every control picks from a named set; anything outside the set is a broken
primitive, not a variant.

The text variants are exactly six: display, headline, title, body, label,
mono. Variant names are jobs, not decoration. Display leads a rare editorial
moment. Headline names a section. Title anchors a card, dialog, or compact
region. Body carries reading. Label names structure — category tags, field
labels, bylines, metadata, compact status. Mono carries code and machine
detail. Do not fake hierarchy with arbitrary font sizes; choose the tier that
matches the job, then use tone, weight, and spacing for the rest.

The tones are exactly seven: default, muted, inverse, success, warning, info,
destructive. Tone is part of the message. Default is the main reading plane.
Muted carries secondary information. Inverse is for dark or primary surfaces.
The four status tones appear only when the words have that state meaning.
Hierarchy starts with tone and weight before size — a secondary note usually
wants muted body or label, not a smaller custom font. If the prose needs
emphasis, improve the sentence before adding a style.

The control emphasis ladder is exactly five rungs: primary, secondary,
outline, ghost, link. One primary action per view is the rule; everything
else steps down the ladder. Primary is for the action the screen exists to
complete — if two buttons both look primary, the hierarchy failed.
Destructive is a meaning, not a rung: it is rare, it names the destructive
act directly, and it is never borrowed for urgency, emphasis, or brand heat.

Fields are quiet until they are active: hairline border, muted placeholder,
clear label, and a focused ring when the user engages. The focus ring is
guidance, not decoration. Errors state facts next to the field that caused
them — do not hide field errors in modals, toasts, or generic banners when
the user needs to fix one input.

Balanced text is for headings and compact statements. Do not balance long
body copy into jagged reading.

The form reference shows the intended decision order: stacked labels and
fields, compact helper text, one submit, secondary escape. Copy the decision
order before adjusting surface detail.
