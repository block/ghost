---
name: token-contract-holds
description: Token, theme, and component changes preserve the semantic-role contract, elevation tiers, radius coherence, and rhythm scale.
severity: high
references:
  - asset.tokens
  - context.theming
  - pattern.composition
  - principle.named-decisions
---

Grade whether the change preserves the token contract in `asset.tokens`, the
theming seams in `context.theming`, and the composition grammar in
`pattern.composition`. Review changed component and style code by view, not
just by file. Flag:

- new component code authored against raw palette utilities (`bg-gray-*`,
  `bg-white`, `bg-black`), literal hex/rgb/hsl values, or the deprecated
  `background-*`, `text-*`, `border-*` compatibility aliases;
- new broad duplicate aliases (`background-alt`, `border-strong`, or similar)
  instead of narrow, job-named extensions;
- literal color values introduced outside the primitive layer;
- chart hues (`chart-1` through `chart-5`) on buttons, badges, headers, or
  backgrounds: any expressive color that is neither a gray, a status token,
  nor a chart role inside data visualization;
- status colors used without their meaning: red for emphasis, green for
  brand warmth, blue as an accent;
- `box-shadow` values (or arbitrary `shadow-[...]` utilities) that use
  neither an elevation tier (`--shadow-card`, `--shadow-popover`,
  `--shadow-modal`) nor a component-owned shadow (`--shadow-btn`,
  `--shadow-mini`, `--shadow-kbd`), and nested surfaces that stack tiers;
- margins on siblings inside a Stack, and arbitrary gap values (`gap-[13px]`)
  that route around the gap scale;
- buttons or inputs restyled away from the control radius role, or a theme
  rebinding one control's radius without the others: radius coherence is
  contract, not preference;
- light/dark behavior implemented inside a component rather than the
  token/theme layer;
- tokens bridged into Tailwind that only raw CSS should consume.
