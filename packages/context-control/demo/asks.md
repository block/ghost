# context-control demo asks

These asks target the default skeleton written by `ghost init`. The format is
shared with steering-control. `expect:` names nodes a good selector should pull.
`poison:` names nodes whose condition does not apply.

## Ask 1 — notification settings

Build a dense settings screen for notification preferences.

expect: foundation.composition, foundation.controls, foundation.layout
poison: context.conversation

## Ask 2 — pricing landing page

Build a pricing landing page with a hero, three plan tiers, a customer quote,
and a closing call to action.

expect: foundation.composition, foundation.color, foundation.type, cliche.median
poison: context.conversation

## Ask 3 — assistant conversation

Build an AI assistant thread with user turns, tool calls, and a prompt composer.

expect: context.conversation, foundation.composition, foundation.controls

## Ask 4 — payment receipt email

Build a transactional payment receipt email with the amount, payment method,
date, and invoice link.

expect: foundation.layout, foundation.type, foundation.voice
poison: context.conversation

## Ask 5 — modal motion

Define the motion for a modal opening and closing.

expect: foundation.composition, foundation.motion
poison: context.conversation
