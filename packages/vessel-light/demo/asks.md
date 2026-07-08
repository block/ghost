# Demo asks (verbatim, same across arms)

`expect:` / `poison:` / `discount:` lines are harness metadata — the asks
parser strips them; they never enter generation context. Sets are minimal
and defensible: contested nodes are listed nowhere and score as neutral.

## Ask 1 — billing settings page

Build a billing settings page for the Meridian workspace: plan summary,
payment method on file, billing email, invoice history, and a way to cancel
the subscription. Single HTML file.

expect: foundation.tokens, primitive.control, primitive.stack
poison: pattern.email, pattern.editorial

## Ask 2 — pricing landing page

Build a pricing landing page for Meridian: hero, three plan tiers, one
customer quote, closing call to action. Single HTML file.

expect: pattern.editorial, foundation.expression, foundation.type
poison: pattern.email
discount: unprompted-dark-theme

## Ask 3 — payment-receipt email

Build the payment-receipt email Meridian sends after a successful invoice
payment: amount, plan, date, card last-4, link to the invoice. Single HTML
file, must render in Outlook and Gmail.

expect: pattern.email, foundation.voice
poison: pattern.editorial, pattern.data-density
discount: inter-font-default, segoe-font-default
