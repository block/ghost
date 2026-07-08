---
description: The token pipeline — primitive values feed semantic roles, components author role-first, extensions stay narrow and job-named.
materials:
  - "**/styles/main.css"
  - "**/components/ui/**/*.tsx"
---

The token layer has a fixed shape that all component and styling work must
preserve:

```text
primitive values (gray scale, utility colors)
  -> semantic roles (shadcn names)
    -> narrow job-named extensions
      -> Tailwind utility bridge
```

Author against semantic roles first: `background`, `foreground`, `card`,
`popover`, `muted`, `accent`, `primary`, `secondary`, `destructive`, `border`,
`input`, `ring`, and the sidebar roles. In component code that means
`bg-background`, `text-muted-foreground`, `border-border` — never raw palette
utilities like `bg-gray-100`, and never literal hex, rgb, or hsl in component
code or inline styles.

The base palette is monochrome gray. Red, green, yellow, and blue exist only
when meaning demands them: destructive/error, success, warning, information.
None of them are accents. The chart roles (`chart-1` through `chart-5`) are
the only sanctioned expressive hues, and they live inside data visualization —
they never leak into controls, badges, or chrome.

Extensions to the token set must be narrow and job-named (composer surfaces,
message surfaces, tool/status affordances) — never broad duplicate aliases
such as `background-alt`, `text-alt`, `border-strong`, or `surface-card`.
Bridge a token into Tailwind only when component code should author it as a
utility class.

Elevation is an interaction statement, not decoration. Surfaces pick a tier:
`--shadow-card` sits in flow, `--shadow-popover` floats above it,
`--shadow-modal` interrupts the task. Component shadows (`--shadow-btn`,
`--shadow-mini`, `--shadow-kbd`) belong to the components that own them. Never
write a custom `box-shadow` because a composition feels flat — fix the
structure instead.
