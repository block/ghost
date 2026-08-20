---
for: Writing any copy or choosing the character of motion.
materials:
  - materials/tokens.css
---

## Usage

This is Vessel's answer to temperature — it stands until you replace it.

The relationship is fixed: voice and motion carry the same temperature. Copy
states what happened, what is possible, or what the user must decide — it
does not perform personality — and motion confirms rather than entertains.

The system should sound reliable, not excited by basic competence.
Destructive copy is direct because the risk is direct; softening the verb
makes the interface less honest. Vessel never celebrates at the user. Trust
comes from precision, restraint, and naming the truth plainly.

The voice is a mechanical edit, not a mood — apply it as transformations:
"Sorry, nothing here yet!" → "Nothing yet". "Awesome, your changes have been
saved!" → "Changes saved". "Oops! Something went wrong" → "Payment failed —
card expired". "You might want to consider updating your billing info" →
"Update your billing info". Strip the apology, the applause, and the hedge;
keep the fact and the fix.

Condition: editorial surfaces switch context. Short declarative confident
fragments are correct in heroes and section headings. That same editorial
confidence is wrong in a settings form — product copy serves the task before
it serves the voice. Email copy uses the product voice: factual, not
campaign-like.

To adapt: rewrite this node's current answers in your brand's voice and edit
the duration and ease values in `materials/tokens.css`. The coupling — words
and motion sharing one temperature — is the part worth keeping.

## Rules

- Product UI is the default context — factual, quiet, sentence case, and
  free of applause.
- No exclamation marks; celebration is not reassurance.
- Confirmations are quiet: "Changes saved", never "Awesome!"
- Errors name the problem and the fix in the place where the user can act.
- Buttons name the act — "Delete account", "Save changes", "Invite member",
  not "Do it" or "Let's go".
- Motion carries three durations — `--duration-fast`, `--duration-normal`,
  `--duration-slow` — and one ease, `--ease-spring`, which should feel
  resolved without feeling elastic.
- Hover confirms with color and background shifts at the fast duration.

## Never

- Never ship a vague failure banner — it is evasion; instead name the
  problem and the fix in the place where the user can act.
- Never soften the verb on destructive copy — it makes the interface less
  honest; instead name the destructive act directly.
- Never celebrate at the user — instead let trust come from precision,
  restraint, and naming the truth plainly.
- Never confirm hover with levitation — instead confirm with color and
  background shifts at the fast duration.
- Never carry editorial confidence into a settings form — instead let
  product copy serve the task before it serves the voice.
