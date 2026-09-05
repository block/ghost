---
for: Changing tokens, semantic roles, shadows, or the Tailwind utility bridge.
materials:
  - packages/vessel-react/src/styles/main.css
  - packages/vessel-react/src/styles/font-faces.css
---

## Usage

The token contract has a fixed shape that all token work must preserve:

```text
primitive values (gray scale, utility colors)
  -> semantic roles (shadcn names)
    -> narrow Vessel extensions
      -> Tailwind utility bridge
```

The base palette is monochrome gray. Red, green, yellow, and blue exist only
when meaning demands them: destructive/error, success, warning, information.
None of them are accents. Elevation is an interaction statement, not
decoration.

## Rules

- Primitive values (the gray scale, utility colors) are the only broad place
  for literal color material.
- Shared UI authors against shadcn semantic roles first: `background`,
  `foreground`, `card`, `popover`, `muted`, `accent`, `primary`, `secondary`,
  `destructive`, `border`, `input`, `ring`, and the sidebar roles. In
  component code that means `bg-background`, `text-muted-foreground`,
  `border-border`.
- The chart roles (`chart-1` through `chart-5`) are the only sanctioned
  expressive hues, and they live inside data visualization.
- Vessel extensions must be narrow and job-named: composer surfaces, message
  surfaces, tool/reasoning/status affordances, chips, canvas, code/terminal.
- Bridge a token into Tailwind only when component code should author it as a
  utility class. Raw-CSS-only hooks stay raw CSS variables.
- Surfaces pick a shadow tier: `--shadow-card` sits in flow,
  `--shadow-popover` floats above it, `--shadow-modal` interrupts the task.
  Component shadows (`--shadow-btn`, `--shadow-mini`, `--shadow-kbd`) belong
  to the components that own them.
- The token layer also carries pill-forward geometry (999px radius on
  buttons, inputs, and pills; named radius roles for contained surfaces) and
  a system font stack. Pill controls and fluid clamp display headings are
  median patterns Vessel deliberately shares; their presence is fidelity,
  not drift.

## Never

- Never author component code against raw palette utilities like
  `bg-gray-100`, and never literal hex, rgb, or hsl in component code or
  inline styles: use the semantic role utilities (`bg-background`,
  `text-muted-foreground`, `border-border`).
- Never let the chart hues leak into controls, badges, or chrome: they live
  inside data visualization.
- Never reintroduce broad duplicate aliases such as `background-alt`,
  `text-alt`, `border-strong`, or `surface-card`: add narrow, job-named
  extensions instead.
- Never use the legacy `background-*`, `text-*`, and `border-*` families in
  new component code: they are deprecated compatibility aliases; author
  against the semantic roles.
- Never write a custom `box-shadow` because a composition feels flat: fix
  the structure instead.
