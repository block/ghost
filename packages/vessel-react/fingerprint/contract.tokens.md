---
for: Changing tokens, component styles, semantic roles, or the Tailwind utility bridge.
materials:
  - packages/vessel-react/src/styles/main.css
  - packages/vessel-react/src/components/ui/button.tsx
  - packages/vessel-react/src/components/ui/card.tsx
  - packages/vessel-react/src/components/ui/input.tsx
  - packages/vessel-react/src/components/ui/surface.tsx
  - packages/vessel-react/src/components/ui/text.tsx
---

## Usage

The token layer has a fixed shape that all component and styling work must
preserve:

```text
primitive values (gray scale, utility colors)
  -> semantic roles (shadcn names)
    -> narrow job-named extensions
      -> Tailwind utility bridge
```

The base palette is monochrome gray. Red, green, yellow, and blue exist only
when meaning demands them: destructive/error, success, warning, information.
None of them are accents. Elevation is an interaction statement, not
decoration.

## Rules

- Author against semantic roles first: `background`, `foreground`, `card`,
  `popover`, `muted`, `accent`, `primary`, `secondary`, `destructive`,
  `border`, `input`, `ring`, and the sidebar roles. In component code that
  means `bg-background`, `text-muted-foreground`, `border-border`.
- The chart roles (`chart-1` through `chart-5`) are the only sanctioned
  expressive hues, and they live inside data visualization.
- Extensions to the token set must be narrow and job-named (composer
  surfaces, message surfaces, tool/status affordances).
- Bridge a token into Tailwind only when component code should author it as
  a utility class.
- Surfaces pick a tier: `--shadow-card` sits in flow, `--shadow-popover`
  floats above it, `--shadow-modal` interrupts the task.
- Component shadows (`--shadow-btn`, `--shadow-mini`, `--shadow-kbd`) belong
  to the components that own them.

## Never

- Never use raw palette utilities like `bg-gray-100`, and never literal hex,
  rgb, or hsl in component code or inline styles — author against the
  semantic role utilities.
- Never let the chart hues leak into controls, badges, or chrome — they
  live inside data visualization.
- Never add broad duplicate aliases such as `background-alt`, `text-alt`,
  `border-strong`, or `surface-card` — extensions must be narrow and
  job-named.
- Never write a custom `box-shadow` because a composition feels flat — fix
  the structure instead.
