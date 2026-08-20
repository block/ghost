---
for: The final pass over any composition, or whenever a view feels crowded, busy, or dressed up.
---

## Usage

Restraint is not a mood; it is a test every element has to pass. Before a
view ships, run the pass: each label, divider, icon, caption, and helper
line must name what breaks if it is removed. If nothing breaks, delete it.
Convention is not a reason — "forms usually have this" keeps nothing.

The test has a direction. When a view is crowded, or two elements compete
for attention, the fix is always demotion or deletion — never adding
emphasis to the loser. Raising the volume of one element to beat another
starts an arms race the composition always loses; removing the weaker claim
ends it.

Do: a settings page whose every row survives the what-breaks question, with
one primary action and gaps doing the dividing.

After everything deletable is gone, whatever remains is unmistakably the
point.

## Rules

- Every label, divider, icon, caption, and helper line must name what breaks
  if it is removed; if nothing breaks, delete it.
- A view arrives settled: when content lands, it lands in its final
  position — no reflow, no staggered construction, no element arriving late
  to shift its neighbors.
- While work is genuinely pending, show the smallest true statement (a quiet
  loading state, per the motion doctrine's loop exception) and nothing else.

## Never

- Never fix a crowded view or an attention contest by adding emphasis to the
  loser — instead demote or delete the weaker claim.
- Never add a decorative divider where a gap step states the relationship —
  instead let the gap do the dividing.
- Never add an icon that restates its adjacent label — instead delete the
  icon.
- Never add a tooltip explaining an obvious control — instead delete the
  tooltip.
- Never add onboarding chrome to routine views — instead delete it.
- Never dress a view in credibility costume — instead use a small factual
  source or timestamp line; it beats a dashboard of gauges.
- Never ship skeleton loaders or placeholder shimmer promising content that
  is not there — a fake page is hedging rendered as UI; instead show the
  smallest true statement while work is pending.
- Never ship the settings page with icon-per-row decoration, a divider under
  every group, a progress shimmer on load, and a bolded second CTA competing
  for the eye — instead run the deletion pass until every row survives the
  what-breaks question.
