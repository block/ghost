---
name: Shape matches the job
description: Flags views composed for the wrong reader job — a form styled as a table, an announcement headline over a reviewable artifact, a live state presented as settled fact, a second primary, or a skeleton loader standing in for content.
severity: high
references:
  - grammar.job
  - grammar.deletion
  - grammar.hierarchy
---

Apply this check to diffs that add or restructure a view. Classify the
reader's job first — what they do next with the view — then judge the
composition against the ref that job routes to. These flags catch the
template-convergence failure: a plausible layout applied to a job it does
not fit.

Flag a view whose job routes to one ref but whose composition imitates
another — a submit-and-done task laid out as a dashboard of cards, a
records-scanning task rendered as prose sections, a stop-and-decide moment
inlined into the page instead of interrupting it. (`grammar.job`)

Flag an announcement headline in display or headline type above an artifact
the reader will review — "Here's your draft", "Your plan is ready", "All
set". The artifact opens the view; status lives in quiet metadata or
nowhere. (`grammar.job`)

Flag a live or ongoing value presented without its freshness — no timestamp
or "updated" line in muted metadata near the figure. A moving value styled
as a settled fact misleads. (`grammar.job`)

Flag recommendation or verdict framing where the decision belongs to the
reader and the system cannot honestly rank the options. Present the
material; withhold the verdict. (`grammar.job`)

Flag a second primary-variant action in a view, and flag a promoted primary
on a view that honestly earns none — a steady status view, an open
comparison. Zero is a valid spend of `--primary-budget`.
(`grammar.hierarchy`)

Flag skeleton loaders, placeholder shimmer, or staged construction where
content will land — and any element that cannot name what breaks if it is
removed. The fix is demotion or deletion, never more emphasis.
(`grammar.deletion`)
