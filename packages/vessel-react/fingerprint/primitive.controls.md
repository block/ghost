---
description: Buttons, inputs, and forms — one primary action per view, quiet fields, focus rings as guidance, errors as facts at the field.
materials:
  - "**/components/ui/button.tsx"
  - "**/components/ui/button-group.tsx"
  - "**/components/ui/input.tsx"
  - "**/components/ui/input-group.tsx"
  - "**/components/ui/textarea.tsx"
  - "**/components/ui/select.tsx"
  - "**/components/ui/form.tsx"
  - "**/components/ui/label.tsx"
---

Controls make decisions obvious without making the view loud.

One primary action per view. The `default` button variant is for the action
the screen exists to complete; everything else steps down the vocabulary —
`secondary`, `outline`, `ghost`, `link`. If two buttons both look primary,
the hierarchy failed. Do not invent variants outside this vocabulary; if a
new one is genuinely needed, it comes from repeated observed need and gets
added to the shared component, not inlined as one-off classnames.

`destructive` is red and rare. It names the destructive act directly. Red is
never urgency, emphasis, or heat.

Hover confirms with color and background shifts at the component's built-in
transition — never with `translateY` lift or a growing shadow. The source
encodes this; do not add motion on top.

Fields are quiet until active: hairline border, muted placeholder, clear
label, focus ring on engagement. The ring is guidance, not decoration — do
not restyle it away or amplify it.

Errors state facts next to the field that caused them, through the form
component's invalid states (`aria-invalid`, field messages). Do not move
field errors into modals, toasts, or generic banners when the user needs to
fix one input.

Compose control rows with the group components rather than ad-hoc flex
wrappers, so spacing and radius joining stay owned by the system.
