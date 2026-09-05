---
for: "Creating or changing a theme, or rebinding token values: font stack, radius, shadows, gray ramp, or semantic roles."
materials:
  - packages/vessel-react/src/styles/main.css
---

In this context: you are creating or changing a theme, or rebinding the
values behind Vessel's tokens.

## Usage

Vessel ships vanilla: a deliberate default binding, not the language itself.
A theme rebinds values at the seams; the grammar beneath them is invariant.
Free seams rebind without ceremony; a theme that breaks the invariant grammar
is a fork, not a theme. If a theme needs a hook the seams do not expose, add
a narrow job-named token: that is a contract change and should be reviewed
as one.

## Rules

Free seams: rebind in the theme layer (`:root` / `.dark` overrides):

- the gray ramp, and the values behind every semantic role;
- the radius values (`--radius-pill`, `--radius-card`, `--radius-modal`,
  `--radius-dropdown`, and friends): pill-first is the vanilla default with
  taste, not law; a theme may flatten controls;
- the shadow values inside each tier;
- the font stack: vanilla stays on system fonts so no brand is baked in; a
  theme brings its own typeface;
- the chart hues.

Invariant grammar: holds in every theme:

- Radius coherence: controls share one radius role and contained surfaces
  share another, and the system stays ordered.
- Tier ordering: card reads below popover reads below modal. Elevation must
  keep meaning interaction, whatever the shadow values are.
- Status semantics: red is destructive/error, green success, yellow warning,
  blue information. Status hues never become atmosphere.
- Role integrity: every foreground role stays legible on its paired surface
  role. Rebind pairs together.
- Monochrome-first: whatever the ramp's hue temperature, the interface reads
  as one quiet scale with meaning carried by structure. Expressive color
  stays inside data visualization.
- Controls confirm with color and background shifts, not levitation.

## Never

- Never rebind buttons to a new radius while inputs keep the old one: that
  is drift, not theming; keep controls on one shared radius role.
- Never edit component classnames to route around a token: rebind the seam
  in the theme layer (`:root` / `.dark` overrides).
