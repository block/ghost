---
name: Token discipline
description: Flags raw palette values, invented shadows, margin-driven rhythm, and role bypasses that break the token contract.
severity: high
references:
  - contract.tokens
  - contract.theming
  - primitive.composition
---

Review changed component and style code by view, not just by file.

Flag raw palette utilities (`bg-gray-*`, `text-gray-*`, `bg-white`,
`bg-black`) and literal hex, rgb, or hsl values in component code or inline
styles when a semantic role expresses the same thing. The authoring
vocabulary is `bg-background`, `text-muted-foreground`, `border-border`, and
the other role utilities.

Flag the deprecated compatibility aliases (`background-*`, `text-*`,
`border-*` token families) in new code. They exist for migration, not
authoring.

Flag chart hues (`chart-1` through `chart-5`) used outside data
visualization markup — on buttons, badges, headers, or backgrounds. Flag any
expressive color that is neither a gray, a status token, nor a chart role.

Flag status colors used without their meaning: red for emphasis, green for
brand warmth, blue as an accent. Red is destructive/error, green success,
yellow warning, blue information — always.

Flag `box-shadow` values (or arbitrary `shadow-[...]` utilities) that do not
use the elevation tiers (`--shadow-card`, `--shadow-popover`,
`--shadow-modal`) or a component-owned shadow (`--shadow-btn`,
`--shadow-mini`, `--shadow-kbd`). Do not accept a custom shadow because it
is visually close. Flag nested surfaces that stack elevation tiers.

Flag new broad token aliases (`background-alt`, `border-strong`,
`surface-card`, and similar). Token extensions must be narrow and job-named.

Flag margins on siblings inside a Stack, and arbitrary gap values
(`gap-[13px]`) that route around the gap scale. Rhythm comes from the
stack's gap prop; recommend changing the gap or splitting the stack.

Flag buttons or text inputs restyled away from the control radius role, and
theme changes that rebind one control's radius without the others. Radius
coherence is contract, not preference.
