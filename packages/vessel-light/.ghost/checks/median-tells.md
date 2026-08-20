---
name: Median tells
description: Flags the measured defaults of unsteered generation and current model-signature tells — hover-lift, default accents, unprompted dark theme, gradient text, frequency tells, and per-model signatures.
severity: high
references:
  - standard.model-defaults > Hover-lift
  - standard.model-defaults > Indigo accent
  - standard.model-defaults > Dark theme
  - standard.model-defaults > Gradients
  - standard.model-defaults > Glassmorphism
  - standard.model-defaults > Side-stripe
  - standard.model-defaults > Cream surface
  - standard.model-defaults > Chat bubbles
  - standard.model-defaults > Stock copy
  - standard.model-defaults > Celebration
  - standard.model-defaults > Hero metric
  - standard.model-defaults > Eyebrow kicker
---

This is Vessel's adaptation of the shared median check; the fidelity carve-outs
below are the body's own. These flags target the measured convergence patterns
of unsteered model generation, plus tells specific to individual models. Each
is mechanically detectable in a diff. Pruning a rule from `standard.model-defaults`
orphans its paired reference here — `ghost validate` warns; delete the flag and
its reference together.

Flag `transform` with `translateY` inside a `:hover` rule on cards, buttons,
or list items, especially paired with a shadow increase. Hover confirmation
in Vessel is color and background change, not lift.
(`standard.model-defaults > Hover-lift`)

Flag accent values in the indigo/blue/purple default family (`#4f46e5`,
`#6366f1`, `#2563eb`, `#3b82f6`, `#8b5cf6`, and close neighbors) unless the
diff shows the user asked for them. They are model defaults, not palette
members. (`standard.model-defaults > Indigo accent`)

Flag whole-page dark backgrounds when the ask did not request dark mode.
Dark surfaces in Vessel are the editorial dark band or an explicit `.dark`
theme, never an unprompted default. (`standard.model-defaults > Dark theme`)

Flag `linear-gradient` or `radial-gradient` as page or section backgrounds,
and gradient-filled buttons. (`standard.model-defaults > Gradients`)

Flag `backdrop-filter: blur` used for glassmorphism cards.
(`standard.model-defaults > Glassmorphism`)

Flag `background-clip: text` (with or without the `-webkit-` prefix) paired
with a gradient. Emphasis comes from weight or size in a single solid color.

Flag a thick colored border on one side of an element (`border-left` or a
`border-l-*` utility at 2px or more in a non-neutral color) while the other
sides stay thin. (`standard.model-defaults > Side-stripe`)

Flag warm off-white page backgrounds in the cream/sand/beige band, and token
names like `--cream`, `--sand`, `--parchment`, `--linen` introduced by the
diff. (`standard.model-defaults > Cream surface`)

Flag assistant messages rendered as bubbles with initials-circle avatars.
(`standard.model-defaults > Chat bubbles`)

Flag emoji used as icons or imagery in interface chrome. Text labels carry
meaning.

Flag stock template copy in headings: "Simple, transparent pricing",
"Welcome back", and interchangeable-with-a-competitor phrasing. Recommend
copy that states what this product specifically does.
(`standard.model-defaults > Stock copy`)

Flag exclamation-marked success copy, confetti language, and celebratory UI
("You did it!", "Awesome!"). Confirmation is quiet and factual.
(`standard.model-defaults > Celebration`)

Flag the hero-metric template — a big number, small label, and supporting
stats as default proof — unless the metric shows real user data. Recommend
evidence specific to the product, or nothing.
(`standard.model-defaults > Hero metric`)

Frequency tells — the crime is repetition, not the move (advisory):

Flag three or more uppercase, tracked eyebrow kickers above section headings
in one page. One named kicker is voice; a kicker on every section is model
grammar. (`standard.model-defaults > Eyebrow kicker`)

Flag five or more em-dashes in body copy in one view.

Flag three or more instances of the aphoristic rebuttal cadence ("Not X. Y."
/ "Sentence. No qualifiers.") in one page's copy.

Model-signature tells — skip any block whose model did not produce the diff
(advisory):

Codex: flag a 1px border paired with a box-shadow of 16px blur or more on
the same element — pick a solid border or a tight shadow, not both. Flag
border-radius of 32px or more on cards, sections, or inputs. Flag 1px
linear-gradient grid or repeating-stripe backgrounds used as decoration.

Gemini: flag `transform` (scale, rotate, translate) on `img` inside a
`:hover` rule, including group-hover utilities targeting a child image.
Animate the card's background, border, or shadow instead.

Do not flag pill-shaped controls or fluid clamp display headings — those
median patterns are deliberately shared by Vessel and their presence is
fidelity.
