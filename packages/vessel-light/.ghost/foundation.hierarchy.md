---
for: Any view containing text or actions.
materials:
  - materials/primitives.css
  - materials/examples/composition.form.html
---

## Usage

Hierarchy is a closed vocabulary, not a size slider. Every piece of text and
every control picks from a named set; anything outside the set is a broken
primitive, not a variant.

Variant names are jobs, not decoration. Display leads a rare editorial
moment. Headline names a section. Title anchors a card, dialog, or compact
region. Body carries reading. Label names structure — category tags, field
labels, bylines, metadata, compact status. Mono carries code and machine
detail.

Tone is part of the message. Default is the main reading plane. Muted carries
secondary information. Inverse is for dark or primary surfaces. Hierarchy
starts with tone and weight before size — a secondary note usually wants
muted body or label, not a smaller custom font. If the prose needs emphasis,
improve the sentence before adding a style.

Primary is for the action the screen exists to complete — if two buttons
both look primary, the hierarchy failed. And some views honestly earn none: a
steady status view or an open comparison has no action the screen exists to
complete, and promoting one anyway puts the system's thumb on the scale.
Zero is a valid spend.

Destructive is a meaning, not a rung: it is rare, and it names the
destructive act directly.

The focus ring is guidance, not decoration. Proportional figures in a data
column wobble, and a wobbling column reads as sloppy arithmetic. Mono already
carries tabular alignment for machine detail; the rule extends to any numeric
data in product UI.

The form reference shows the intended decision order: stacked labels and
fields, compact helper text, one submit, secondary escape. Copy the decision
order before adjusting surface detail.

## Rules

- The text variants are exactly six: display, headline, title, body, label,
  mono.
- The tones are exactly seven: default, muted, inverse, success, warning,
  info, destructive.
- The four status tones appear only when the words have that state meaning.
- The control emphasis ladder is exactly five rungs: primary, secondary,
  outline, ghost, link.
- At most one primary action per view (`--primary-budget: 1`); everything
  else steps down the ladder.
- Fields are quiet until they are active: hairline border, muted
  placeholder, clear label, and a focused ring when the user engages.
- Errors state facts next to the field that caused them.
- Figures that will be compared or scanned — amounts, counts, dates in
  columns, any metric — set in tabular numerals (`--numeric-tabular`), with
  the unit tight to the number.
- Balanced text is for headings and compact statements.

## Never

- Never fake hierarchy with arbitrary font sizes — instead choose the tier
  that matches the job, then use tone, weight, and spacing for the rest.
- Never borrow destructive for urgency, emphasis, or brand heat — instead
  reserve it for the destructive act it names.
- Never hide field errors in modals, toasts, or generic banners when the
  user needs to fix one input — instead state the facts next to the field
  that caused them.
- Never balance long body copy into jagged reading — instead reserve
  balanced text for headings and compact statements.
