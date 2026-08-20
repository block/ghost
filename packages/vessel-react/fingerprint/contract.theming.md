---
for: Creating or changing a theme, token binding, font stack, radius, shadow, or gray ramp.
materials:
  - packages/vessel-react/src/styles/main.css
---

## Usage

Vessel ships vanilla: a deliberate default binding, not the language itself.
A theme rebinds values at the seams. The grammar beneath them is invariant.
Free seams rebind without ceremony; a theme that breaks the invariant
grammar is a fork, not a theme. If a theme needs a hook the seams don't
expose, add a narrow job-named token — that is a contract change and should
be reviewed as one.

## Rules

- Free seam: the gray ramp, and the values behind every semantic role.
- Free seam: the radius values: `--radius-pill`, `--radius-card`,
  `--radius-modal`, `--radius-dropdown`, and friends. Pill-first is the
  vanilla default with taste, not law; a theme may flatten controls.
- Free seam: the shadow values inside each tier.
- Free seam: the font stack. Vanilla stays on system fonts so no brand is
  baked in; a theme brings its own typeface.
- Free seam: the chart hues.
- Radius coherence: controls share one radius role and contained surfaces
  share another, and the system stays ordered.
- Tier ordering: card reads below popover reads below modal in every theme.
  Elevation must keep meaning interaction, whatever the shadow values are.
- Status semantics: red is destructive/error, green success, yellow warning,
  blue information — in every theme. Status hues never become atmosphere.
- Role integrity: every foreground role stays legible on its paired surface
  role. Rebind pairs together.
- Monochrome-first: whatever the ramp's hue temperature, the interface reads
  as one quiet scale with meaning carried by structure. Expressive color
  stays inside data visualization.
- Controls confirm with color and background shifts, not levitation, in
  every theme.
- Rebind seams in the theme layer (`:root` / `.dark` overrides).

## Never

- Never rebind buttons to a new radius while inputs keep the old one — that
  is drift, not theming; keep controls on one shared radius role.
- Never edit component classnames to route around a token — rebind the seam
  in the theme layer (`:root` / `.dark` overrides).
