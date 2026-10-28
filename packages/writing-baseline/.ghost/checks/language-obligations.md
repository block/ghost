---
name: Language obligations
description: Flags copy that breaks the shared language obligations, including invented evidence, manufactured pressure, confirmshaming, hidden cost, vague actions and errors, sensory-only instructions, unreadable alt text, outcome-free labels, softened destructive verbs, drifting names, fragment strings, and assumed identity.
severity: high
references:
  - standard.language > Invented evidence
  - standard.language > Pressure
  - standard.language > Decline options
  - standard.language > Cost before commitment
  - standard.language > Failure
  - standard.language > Self-describing actions
  - standard.language > Errors that recover
  - standard.language > Sensory instructions
  - standard.language > Image text
  - standard.language > Plain words where it counts
  - standard.language > Labels name outcomes
  - standard.language > Destructive acts
  - standard.language > One name per thing
  - standard.language > Whole strings
  - standard.language > Assumed identity
---

These flags enforce obligations, not voice. Judge whether each obligation
holds; do not flag a sentence for sounding unlike the brand. Voice review
belongs to the brand's own checks. Obligations are not pruned when a brand
adapts the node; if a brand rewrites a rule's wording, keep its heading so
these references resolve.

Mechanically detectable in a diff:

Flag link or button text that is exactly "Click here", "Here", "Read more",
"Learn more", or "More" with no accessible name that adds the destination.
(`standard.language > Self-describing actions`)

Flag error copy that is only "Invalid input", "Error", "Something went
wrong", or an error code, and errors conveyed only by color or icon.
(`standard.language > Errors that recover`)

Flag instructions that point at a control by color, shape, or position
("the green button", "on the right", "the round icon").
(`standard.language > Sensory instructions`)

Flag `alt` text that begins "Image of" or "Picture of", repeats a filename,
or is a comma-separated keyword list; flag a missing `alt` attribute on
`img`. (`standard.language > Image text`)

Flag a confirmation dialog for a destructive or consequential action whose
buttons are "OK", "Yes", "Confirm", or "Cancel" without naming the act.
(`standard.language > Labels name outcomes`)

Flag strings that build a sentence from concatenated fragments, and flag
`(s)` pluralization. (`standard.language > Whole strings`)

Flag "he or she", "he/she", "s/he", and gendered pronouns for an unspecified
reader. (`standard.language > Assumed identity`)

Judgment against the ask and its materials:

Flag any statistic, count, quote, testimonial, rating, award, customer logo,
date, or price that the ask and its materials do not supply. An unmarked
plausible number is the most common failure; a visible placeholder passes.
(`standard.language > Invented evidence`)

Flag deadlines, countdowns, stock counts, and "only today" language the ask
did not supply. (`standard.language > Pressure`)

Flag decline options that shame, guilt, or mock the person who declines.
(`standard.language > Decline options`)

Flag a price, recurring charge, renewal term, or data-sharing commitment that
first appears after the committing action or only behind a link.
(`standard.language > Cost before commitment`)

Flag failure copy that guesses at a cause, implies fault, or omits the next
step. (`standard.language > Failure`)

Flag jargon, undefined terms, or long compound sentences in copy about money,
safety, health, privacy, legal terms, or account access.
(`standard.language > Plain words where it counts`)

Flag a destructive action that does not say what will be lost and whether it
can be undone, or that uses a softer verb than the act.
(`standard.language > Destructive acts`)

Flag one object or action called by two or more names within a surface or
flow. (`standard.language > One name per thing`)
