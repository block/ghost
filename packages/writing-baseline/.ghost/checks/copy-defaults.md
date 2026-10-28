---
name: Copy defaults
description: Flags generic phrasing the shared copy defaults reject, including stock headings, celebration, hype, superlatives, corporate register, hedges, interface apology, rhetorical openers, and generic actions.
severity: medium
references:
  - standard.copy-defaults > Stock headings
  - standard.copy-defaults > Celebration
  - standard.copy-defaults > Aphoristic cadence
  - standard.copy-defaults > Em-dash pileups
  - standard.copy-defaults > Eyebrow kicker
  - standard.copy-defaults > Hype vocabulary
  - standard.copy-defaults > Empty superlatives
  - standard.copy-defaults > Corporate register
  - standard.copy-defaults > Vague nouns
  - standard.copy-defaults > Absolute promises
  - standard.copy-defaults > Hedge stacks
  - standard.copy-defaults > Interface apology
  - standard.copy-defaults > Rhetorical openers
  - standard.copy-defaults > Reflexive triads
  - standard.copy-defaults > Generic actions
  - standard.copy-defaults > People as users
---

These flags target defaults, not obligations. A brand may have replaced any
of them; skip a flag whose rule the package no longer contains. Pruning a
rule from `standard.copy-defaults` orphans its paired reference here, and
`ghost validate` warns; delete the flag and its reference together.

Lexical, detectable in the diff:

Flag the hype words, empty superlatives, corporate phrases, and vague nouns
listed in `standard.copy-defaults` when they appear in customer-facing copy.
Quote the word and suggest the concrete replacement.
(`standard.copy-defaults > Hype vocabulary`,
`standard.copy-defaults > Empty superlatives`,
`standard.copy-defaults > Corporate register`,
`standard.copy-defaults > Vague nouns`)

Flag "Oops", "Uh oh", and "Sorry, something went wrong".
(`standard.copy-defaults > Interface apology`)

Flag "Get started", "Submit", and "Continue" as primary action labels where
the action has a specific verb. (`standard.copy-defaults > Generic actions`)

Flag "users" in copy addressed to or about people.
(`standard.copy-defaults > People as users`)

Frequency, counted per view (advisory):

Flag five or more em dashes. (`standard.copy-defaults > Em-dash pileups`)

Flag three or more instances of the "Not X. Y." cadence.
(`standard.copy-defaults > Aphoristic cadence`)

Flag three or more uppercase eyebrow labels above section headings.
(`standard.copy-defaults > Eyebrow kicker`)

Judgment against the ask:

Flag a heading that would work unchanged for a competitor.
(`standard.copy-defaults > Stock headings`)

Flag exclamation-marked success or confetti language on a routine outcome.
(`standard.copy-defaults > Celebration`)

Flag "guaranteed", "always", "never", "perfect", "100% secure", or "no risk"
used as a product claim the ask does not establish as literally true.
(`standard.copy-defaults > Absolute promises`)

Flag stacked hedges, question openers, "Whether you're X or Y", and lists of
three the evidence does not support.
(`standard.copy-defaults > Hedge stacks`,
`standard.copy-defaults > Rhetorical openers`,
`standard.copy-defaults > Reflexive triads`)
