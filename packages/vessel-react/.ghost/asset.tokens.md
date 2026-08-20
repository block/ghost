---
for: Changing tokens, semantic roles, or the Tailwind utility bridge.
materials:
  - packages/vessel-react/src/styles/main.css
  - packages/vessel-react/src/styles/font-faces.css
---

## Usage

The token contract has a fixed shape that all token work must preserve:

```text
primitive values
  -> semantic roles
    -> narrow Vessel extensions
      -> Tailwind utility bridge
```

## Rules

- Primitive values (the gray scale, utility colors) are the only broad place
  for literal color material.
- Shared UI authors against shadcn semantic roles first: `background`,
  `foreground`, `card`, `popover`, `muted`, `accent`, `primary`, `secondary`,
  `destructive`, `border`, `input`, `ring`, and the sidebar roles. In
  component code that means `bg-background`, `text-muted-foreground`,
  `border-border`.
- Vessel extensions must be narrow and job-named: composer surfaces, message
  surfaces, tool/reasoning/status affordances, chips, canvas, code/terminal.
- Bridge a token into Tailwind only when component code should author it as a
  utility class. Raw-CSS-only hooks stay raw CSS variables.
- The token layer carries fixed non-color decisions: a four-tier shadow
  hierarchy (`mini`, `card`, `elevated`, `modal`), pill-forward geometry
  (999px radius on buttons, inputs, and pills; named radius roles for
  contained surfaces), and a system font stack.

## Never

- Never author component code against raw palette utilities — use the
  semantic role utilities (`bg-background`, `text-muted-foreground`,
  `border-border`).
- Never reintroduce broad duplicate aliases such as `background-alt`,
  `text-alt`, `border-strong`, or `surface-card` — add narrow, job-named
  extensions instead.
- Never use the legacy `background-*`, `text-*`, and `border-*` families in
  new component code — they are deprecated compatibility aliases; author
  against the semantic roles.
