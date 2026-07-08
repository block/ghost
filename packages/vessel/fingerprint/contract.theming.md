---
description: "The theming seams — which token bindings a theme may rebind freely, and which relationships must hold in every theme."
materials:
  - "**/styles/main.css"
---

Vessel ships vanilla: a deliberate default binding, not the language itself.
A theme rebinds values at the seams. The grammar beneath them is invariant.

Free seams — rebind without ceremony:

- The gray ramp, and the values behind every semantic role.
- The radius values: `--radius-pill`, `--radius-card`, `--radius-modal`,
  `--radius-dropdown`, and friends. Pill-first is the vanilla default with
  taste, not law; a theme may flatten controls.
- The shadow values inside each tier.
- The font stack. Vanilla stays on system fonts so no brand is baked in;
  a theme brings its own typeface.
- The chart hues.

Invariant grammar — a theme that breaks these is a fork, not a theme:

- Radius coherence: controls share one radius role and contained surfaces
  share another, and the system stays ordered. Rebinding buttons to a new
  radius while inputs keep the old one is drift, not theming.
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

Rebind seams in the theme layer (`:root` / `.dark` overrides), never by
editing component classnames to route around a token. If a theme needs a hook
the seams don't expose, add a narrow job-named token — that is a contract
change and should be reviewed as one.
