---
description: The token contract — primitives feed semantic roles, extensions stay narrow and job-named, no broad alias sprawl.
materials:
  - packages/vessel/src/styles/main.css
  - packages/vessel/src/styles/*.css
---

The token contract has a fixed shape that all token work must preserve:

```text
primitive values
  -> semantic roles
    -> narrow Vessel extensions
      -> Tailwind utility bridge
```

- Primitive values (the gray scale, utility colors) are the only broad place
  for literal color material.
- Shared UI authors against shadcn semantic roles first: `background`,
  `foreground`, `card`, `popover`, `muted`, `accent`, `primary`, `secondary`,
  `destructive`, `border`, `input`, `ring`, and the sidebar roles. In
  component code that means `bg-background`, `text-muted-foreground`,
  `border-border` — never raw palette utilities.
- Vessel extensions must be narrow and job-named: composer surfaces, message
  surfaces, tool/reasoning/status affordances, chips, canvas, code/terminal.
  Do not reintroduce broad duplicate aliases such as `background-alt`,
  `text-alt`, `border-strong`, or `surface-card`. The legacy `background-*`,
  `text-*`, and `border-*` families that remain are deprecated compatibility
  aliases; new component code must not use them.
- Bridge a token into Tailwind only when component code should author it as a
  utility class. Raw-CSS-only hooks stay raw CSS variables.

Fixed non-color decisions carried by the token layer: a four-tier shadow
hierarchy (`mini`, `card`, `elevated`, `modal`), pill-forward geometry
(999px radius on buttons, inputs, and pills; named radius roles for contained
surfaces), and a system font stack.
