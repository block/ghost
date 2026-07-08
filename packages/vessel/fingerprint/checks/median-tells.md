---
name: Median tells
description: Flags the measured defaults of unsteered generation — hover-lift, default accents, unprompted dark theme, gradients, chat bubbles, emoji icons, stock copy.
severity: high
references:
  - anti-goal.median
  - pattern.conversation
---

These flags target the measured convergence patterns of unsteered model
generation. Each is mechanically detectable in a diff.

Flag `translateY` inside a `:hover` rule or a `hover:` utility (for example
`hover:-translate-y-*`) on cards, buttons, or list items, especially paired
with a shadow increase. Hover confirmation here is color and background
change, not lift.

Flag accent values in the indigo/blue default family (`#4f46e5`, `#6366f1`,
`#2563eb`, `#3b82f6`, and close neighbors, including `indigo-*` and `blue-*`
utilities) unless the diff shows the user asked for them. They are model
defaults, not palette members.

Flag whole-page dark backgrounds when the ask did not request dark mode.
Dark surfaces here are the explicit `.dark` theme, never an unprompted
default.

Flag `linear-gradient` or `radial-gradient` (or `bg-gradient-*` utilities)
as page or section backgrounds, and gradient-filled buttons. Also flag
`backdrop-filter: blur` / `backdrop-blur-*` used for glassmorphism cards.

Flag assistant messages rendered as bubbles with initials-circle avatars
instead of the message components' plain-prose grammar. Flag emoji used as
icons or imagery in interface chrome.

Flag stock template copy in headings: "Simple, transparent pricing",
"Welcome back", and interchangeable-with-a-competitor phrasing. Recommend
copy that states what this product specifically does.

Do not flag pill-shaped controls or fluid clamp display headings — those
median patterns are deliberately shared here and their presence is fidelity.
