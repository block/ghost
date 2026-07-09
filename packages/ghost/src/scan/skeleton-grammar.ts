import type { TemplateFile } from "./templates.js";

/**
 * The skeleton template's law tier: the median floor plus the six grammar
 * nodes. These are the parts of the default fingerprint that are safe to
 * consume verbatim and survive any future rebrand — they speak in token
 * roles and closed sets, never in literal brand values. The signature dials
 * live in `skeleton-template.ts`.
 */
export const SKELETON_GRAMMAR_FILES: TemplateFile[] = [
  {
    relativePath: "anti-goal.median.md",
    content: `---
description: "The model's median defaults this fingerprint refuses — gather for any greenfield visual surface or first-draft copy. Each rule is reject→replace; delete lines your brand legitimately violates."
---

This is the model's median, not your brand. Each rule is reject→replace.
Delete every line your brand legitimately violates — \`ghost validate\` will
surface any check the deletion orphans.

These are not aesthetic opinions. Where a count is given, it is the measured
convergence of 300 unsteered generations across three frontier models (the
antimedian experiment): the defaults a model reaches for when nobody hands it
a brand. An output showing several of these tells reads as generated,
whatever else it does right. A deterministic floor rides alongside these
rules in checks — contrast, reduced motion, sane z-index, no overshoot
easing — verified at review, never steered in prose.

<!-- rule:median-hover-lift -->
Reject hover-lift (\`translateY\` + growing shadow) as the default interaction
→ confirm with color and background change at the fingerprint's fast
duration. (measured: 341)

<!-- rule:median-indigo-accent -->
Reject the indigo/blue/purple default accent (\`#4f46e5\`, \`#2563eb\`,
\`#8b5cf6\` family; purple/violet hue 260–310) → the fingerprint's declared
palette; absent one, monochrome plus a single functional accent.

<!-- rule:median-dark-theme -->
Reject unprompted dark theme → the fingerprint's declared surface.
Dark-to-look-cool and light-to-be-safe are the same retreat from a decision.
(measured: 271)

<!-- rule:median-gradients -->
Reject gradient page and section backgrounds and gradient-filled CTAs → flat
surfaces in semantic roles.

<!-- rule:median-side-stripe -->
Reject side-stripe borders (a thick colored border on one side of a rounded
card) — the single most recognizable tell of AI-generated UI → a full
hairline border, a 4–8% surface tint, or a leading glyph.

<!-- rule:median-cream-surface -->
Reject the cream/sand/beige default surface (warm off-white; token names
like \`--cream\`, \`--sand\`, \`--parchment\` are the tell) → a true off-white,
the brand's own hue, or a committed color; warmth via accent and type, not
the ground.

<!-- rule:median-glassmorphism -->
Reject glassmorphism (decorative backdrop blur) → flat surfaces with real
borders and the fingerprint's elevation tiers.

<!-- rule:median-chat-bubbles -->
Reject chat bubbles with initials-circle avatars for assistant turns →
assistant text plain on the page surface; user turns marked compactly.

<!-- rule:median-stock-copy -->
Reject stock template copy ("Simple, transparent pricing") → headings that
state what this product specifically does.

<!-- rule:median-celebration -->
Reject celebration copy and UI (exclamation success, confetti language) →
quiet factual confirmation.

<!-- rule:median-nested-cards -->
Reject nested cards and everything-in-cards → one surface level per region;
interior hierarchy from spacing and type; spacing and alignment group
without card overhead.

<!-- rule:median-hero-metric -->
Reject the hero-metric template (big number + small label + supporting stats
as default proof) → evidence specific to the product, or nothing. A
prominent metric showing real user data is fine.

<!-- rule:median-every-button-primary -->
Reject every button a primary button → one primary per view; the rest step
down the fingerprint's emphasis ladder.

<!-- rule:median-eyebrow-kicker -->
Reject an eyebrow kicker on every section → at most one, where the register
sanctions it; one named kicker is voice, every-section is AI grammar.

<!-- rule:median-decorative-motion -->
Reject decorative looping animation (pulse/float/shimmer) and uniform
fade-and-rise on every scrolled section → motion as evidence of state
change; loops only for genuine loading; decoration never compensates for
weak structure — fix spacing, copy, and hierarchy first.
`,
  },
  {
    relativePath: "grammar.hierarchy.md",
    content: `---
description: "The closed hierarchy vocabulary — six text variants, seven tones, a five-rung control emphasis ladder, one primary per view — gather for any view that contains text or actions."
---

Hierarchy is a closed vocabulary, not a size slider. Every piece of text and
every control picks from a named set; anything outside the set is a broken
primitive, not a variant.

The text variants are exactly six: display, headline, title, body, label,
mono. Variant names are jobs, not decoration. Display leads a rare editorial
moment. Headline names a section. Title anchors a card, dialog, or compact
region. Body carries reading. Label names structure — category tags, field
labels, bylines, metadata, compact status. Mono carries code and machine
detail. Do not fake hierarchy with arbitrary font sizes; choose the tier that
matches the job, then use tone, weight, and spacing for the rest.

The tones are exactly seven: default, muted, inverse, success, warning, info,
destructive. Tone is part of the message. Default is the main reading plane.
Muted carries secondary information. Inverse is for dark or primary surfaces.
The four status tones appear only when the words have that state meaning.
Hierarchy starts with tone and weight before size — a secondary note usually
wants muted body or label, not a smaller custom font. If the prose needs
emphasis, improve the sentence before adding a style.

The control emphasis ladder is exactly five rungs: primary, secondary,
outline, ghost, link. One primary action per view is the rule; everything
else steps down the ladder. Primary is for the action the screen exists to
complete — if two buttons both look primary, the hierarchy failed.
Destructive is a meaning, not a rung: it is rare, it names the destructive
act directly, and it is never borrowed for urgency, emphasis, or brand heat.

Fields are quiet until they are active: hairline border, muted placeholder,
clear label, and a focused ring when the user engages. The focus ring is
guidance, not decoration. Errors state facts next to the field that caused
them — do not hide field errors in modals, toasts, or generic banners when
the user needs to fix one input.

Balanced text is for headings and compact statements. Do not balance long
body copy into jagged reading.
`,
  },
  {
    relativePath: "grammar.rhythm.md",
    content: `---
description: "Layout rhythm — all layout is stacks with a closed gap step set; gather before laying anything out; never ad-hoc sibling margins."
---

All layout is stacks. Rhythm comes from relationships between siblings, not
from isolated margins pasted onto whichever element was last touched.

The gap steps are exactly five: \`--gap-xs\`, \`--gap-sm\`, \`--gap-md\`,
\`--gap-lg\`, \`--gap-xl\`. Choose the gap that states the relationship. Do not
tune by single pixels to make a screenshot pass.

The default is column, medium gap, stretch alignment, start justification.
That is the ordinary reading rhythm.

Columns are for almost everything: forms, cards, message lists, modal bodies,
settings, empty states, and page sections. A column lets the user scan.

Rows are conditional. Use them for controls, metadata lines, compact status,
and paired label/value moments. If a row starts wrapping awkwardly, it
probably wanted to be a column.

Ad-hoc margins between siblings are forbidden because they hide the rhythm.
When spacing feels wrong, change the stack gap or split the stack.
`,
  },
  {
    relativePath: "grammar.surfaces.md",
    content: `---
description: "Surface roles and the closed elevation set — gather for any card, popover, modal, dialog, scrim, or bordered container; flat is the default, borders are structural, exactly three elevation tiers."
---

Surface is the only way an element gets a background, border, radius, or
shadow. If a container needs visual treatment, it first needs a surface role.

The vocabulary is closed: role, padding, radius, border, and elevation. These
axes create enough range for page flow, cards, popovers, muted blocks,
accents, and dark moments without inventing one-off boxes.

The default surface is flat: no border, no shadow. We do not outline
everything to prove layout exists.

The elevation tiers are exactly three: card, popover, modal. Elevation
implies hierarchy — a card sits in the document flow, a popover floats above
the flow, a modal interrupts the task. Pick the tier that matches the
interaction; never write a custom shadow because the composition feels flat,
and never pair a low tier with an interrupting role or give a routine card
modal gravity. Component shadows belong to the primitives that own them;
never borrow them for layout.

Borders are structural, especially for inputs and overlays. They are not
decorative frames around ordinary text — reject borders as decoration,
especially around assistant text, and use space, tone, and type hierarchy
instead.
`,
  },
  {
    relativePath: "grammar.motion.md",
    content: `---
description: "Motion doctrine — motion is evidence of state change, never decoration; a closed vocabulary of three duration roles and one ease; gather for any transition, animation, or hover treatment."
---

Motion is evidence of a state change. It confirms hover, press, reveal,
collapse, entrance, exit, and spatial movement. It does not entertain.

The entire vocabulary is three duration roles and one ease. Fast is for hover
and press. Normal is for reveals, fades, and small state changes. Slow is
reserved for spatial transitions where the user needs to understand movement.
Do not introduce novelty easings because a surface feels static; the ease's
character is a brand answer — see the temperature signature.

Nothing loops except explicit loading states. A spinner may continue because
work continues. Decorative pulsing, floating, glowing, and attention-seeking
keyframes are off-language.

Prefer opacity and small transform changes. If removing an animation does not
reduce comprehension, the animation was decoration.

Condition: marketing and editorial surfaces may stage entrances — scroll
reveals and section transitions are part of editorial rhythm, still built
from the three durations and the one ease. In product UI the same staging is
decoration.
`,
  },
  {
    relativePath: "grammar.color-roles.md",
    content: `---
description: "Semantic color roles and the rules that govern them — gather before choosing any color; roles not raw values, status is meaning, expression is register-gated and never on controls."
---

The token roles are the source of truth. An agent may combine roles, but it
may not author around them. Raw color values are implementation detail, never
product language.

Author with semantic roles: \`background\`, \`foreground\`, \`card\`, \`popover\`,
\`primary\`, \`secondary\`, \`muted\`, \`accent\`, \`border\`, \`input\`, \`ring\`, and the
status roles. If a container needs a color, it first needs a role.

The status roles — destructive, success, warning, info — exist only when
meaning demands them. Destructive means destructive or error. Success means
success. Warning means warning. Info means information. None of them are
brand accents, and they never moonlight as atmosphere, in any register.

One view should not perform a color palette. If a status color is present,
let the rest of the view stay on the base roles. Richness beyond this is
register-gated: a closed expression set (\`--expression-*\`) exists; its size
and members are a dial — see the palette signature — and each register caps
how loud they may be.

The constant that holds across every register: expression never touches what
you click. Buttons, inputs, and links stay on the base roles everywhere. A
colored control is a different design system.
`,
  },
  {
    relativePath: "grammar.conversation.md",
    content: `---
description: "Conversation grammar — plain assistant text, compact user surfaces, collapsed tool calls, one structured prompt input; gather for any AI thread, agent console, review assistant, or prompt composer."
---

Conversation UI is not chat cosplay. The assistant speaks on the page surface
as plain text: no bubble, no border, no fill.

User turns are compact muted surfaces aligned right. They mark authorship
without turning the thread into alternating balloons.

Assistant hierarchy comes from prose, spacing, and type. Wrapping assistant
messages in cards makes the system look defensive and wastes density.

Tool calls are operational evidence. Collapse them to a labeled one-line
summary with status. Expand only when the user asks for detail, then show
mono content inside the disclosed area.

The prompt input is one bordered surface. The textarea region stays empty of
controls so writing remains the focus. Attachments, model choices, secondary
tools, and send live in a single row below it.

There is one primary send action. Stop and send are mutually exclusive states
of the same action area, not two competing primary buttons.
`,
  },
];
