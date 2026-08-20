---
for: Any view with buttons, inputs, forms, labels, or field errors.
materials:
  - packages/vessel-react/src/components/ui/button.tsx
  - packages/vessel-react/src/components/ui/button-group.tsx
  - packages/vessel-react/src/components/ui/input.tsx
  - packages/vessel-react/src/components/ui/input-group.tsx
  - packages/vessel-react/src/components/ui/textarea.tsx
  - packages/vessel-react/src/components/ui/select.tsx
  - packages/vessel-react/src/components/ui/form.tsx
  - packages/vessel-react/src/components/ui/label.tsx
---

## Usage

Controls make decisions obvious without making the view loud. One primary
action per view. If two buttons both look primary, the hierarchy failed.
Fields are quiet until active, and the focus ring is guidance, not
decoration.

## Rules

- The `default` button variant is for the action the screen exists to
  complete; everything else steps down the vocabulary — `secondary`,
  `outline`, `ghost`, `link`.
- `destructive` is red and rare. It names the destructive act directly.
- Hover confirms with color and background shifts at the component's
  built-in transition. The source encodes this.
- Fields are quiet until active: hairline border, muted placeholder, clear
  label, focus ring on engagement.
- Errors state facts next to the field that caused them, through the form
  component's invalid states (`aria-invalid`, field messages).
- Compose control rows with the group components, so spacing and radius
  joining stay owned by the system.

## Never

- Never invent variants outside this vocabulary — if a new one is genuinely
  needed, it comes from repeated observed need and gets added to the shared
  component, not inlined as one-off classnames.
- Never use red as urgency, emphasis, or heat — `destructive` names the
  destructive act directly.
- Never confirm hover with `translateY` lift or a growing shadow — use the
  component's built-in color and background shifts; do not add motion on
  top.
- Never restyle the focus ring away or amplify it — the ring is guidance,
  not decoration.
- Never move field errors into modals, toasts, or generic banners when the
  user needs to fix one input — state them next to the field through the
  form component's invalid states.
- Never compose control rows with ad-hoc flex wrappers — use the group
  components so spacing and radius joining stay owned by the system.
